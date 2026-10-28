-- OR-K WORK — initial schema.
-- Staff (any active, non-client role) operate the whole workspace.
-- Client users only read their own account. Admins manage people and roles.


/* ------------------------------------------------------------- enums --- */

create type public.work_role as enum (
  'super_admin', 'agency_director', 'creative_director', 'account_manager',
  'copywriter', 'designer', 'motion_designer', 'developer',
  'community_manager', 'client'
);

create type public.work_state as enum (
  'request', 'briefing', 'copy', 'design', 'copy_review', 'creative_review',
  'account_review', 'client_review', 'adjustments', 'approved', 'scheduled',
  'published', 'completed', 'archived'
);

create type public.work_priority as enum ('low', 'medium', 'high', 'urgent');

/* ----------------------------------------------------------- clients --- */

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_text text not null default '',
  accent_color text not null default '#e31572',
  industry text not null default '',
  contact jsonb not null default '{"name":"","role":"","email":"","phone":""}',
  account_manager_id uuid,
  team_ids uuid[] not null default '{}',
  since date not null default current_date,
  created_at timestamptz not null default now()
);

/* ---------------------------------------------------------- profiles --- */

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role public.work_role not null default 'client',
  title text not null default '',
  color text not null default '#e31572',
  active boolean not null default true,
  client_id uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.clients
  add constraint clients_account_manager_fk
  foreign key (account_manager_id) references public.profiles (id) on delete set null;

/* ------------------------------------------------------ role helpers --- */

create or replace function public.work_my_role()
returns public.work_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.work_is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.work_my_role() <> 'client', false)
$$;

create or replace function public.work_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.work_my_role() in ('super_admin', 'agency_director'), false)
$$;

create or replace function public.work_my_client()
returns uuid
language sql stable security definer set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid() and active
$$;

/* ------------------------------------------- profile from auth.users --- */

-- Only invited users, or users created through the admin API with
-- app_metadata.work_role (which end users cannot set), get a staff role.
-- Anyone else lands as an inactive client until an admin activates them.
create or replace function public.work_handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  app jsonb := coalesce(new.raw_app_meta_data, '{}');
  trusted boolean := new.invited_at is not null or app ? 'work_role';
  wanted text := coalesce(app ->> 'work_role', meta ->> 'role');
begin
  insert into public.profiles (id, name, email, role, title, color, active)
  values (
    new.id,
    coalesce(nullif(meta ->> 'name', ''), nullif(meta ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case
      when trusted and wanted in (select unnest(enum_range(null::public.work_role))::text)
        then wanted::public.work_role
      else 'client'
    end,
    coalesce(meta ->> 'title', ''),
    coalesce(meta ->> 'color', '#e31572'),
    trusted
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger work_on_auth_user_created
  after insert on auth.users
  for each row execute function public.work_handle_new_user();

-- Backfill users that already exist (e.g. the master user).
insert into public.profiles (id, name, email, role, title, active)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email, '@', 1)),
  coalesce(u.email, ''),
  case
    when u.raw_user_meta_data ->> 'role' in (select unnest(enum_range(null::public.work_role))::text)
      then (u.raw_user_meta_data ->> 'role')::public.work_role
    else 'super_admin'
  end,
  coalesce(u.raw_user_meta_data ->> 'title', ''),
  true
from auth.users u
on conflict (id) do nothing;

-- Only admins may change roles, activation or client binding.
create or replace function public.work_guard_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.work_is_admin() and (
    new.role is distinct from old.role or
    new.active is distinct from old.active or
    new.client_id is distinct from old.client_id or
    new.email is distinct from old.email
  ) then
    raise exception 'Solo un administrador puede cambiar roles o accesos';
  end if;
  return new;
end;
$$;

create trigger work_guard_profile
  before update on public.profiles
  for each row execute function public.work_guard_profile();

/* ---------------------------------------------------------- projects --- */

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  brief text not null default '',
  status text not null default 'active' check (status in ('active', 'on_hold', 'closed')),
  start_date date not null default current_date,
  target_date date not null default (current_date + 30),
  lead_id uuid references public.profiles (id) on delete set null,
  team_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

/* ---------------------------------------------------------- requests --- */

create table public.request_counters (
  year int primary key,
  last int not null default 0
);

create or replace function public.work_next_request_id()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  y int := extract(year from now())::int;
  n int;
begin
  insert into public.request_counters (year, last) values (y, 1)
  on conflict (year) do update set last = public.request_counters.last + 1
  returning last into n;
  return format('ORK-%s-%s', y, lpad(n::text, 4, '0'));
end;
$$;

create table public.requests (
  id text primary key default public.work_next_request_id(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  campaign text not null default '',
  title text not null,
  description text not null default '',
  objective text not null default '',
  audience text not null default '',
  main_message text not null default '',
  cta text not null default '',
  deliverables text[] not null default '{}',
  formats text[] not null default '{}',
  channels text[] not null default '{}',
  refs text not null default '',
  deadline timestamptz not null default (now() + interval '7 days'),
  priority public.work_priority not null default 'medium',
  state public.work_state not null default 'request',
  assignee_id uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rounds_included int not null default 2,
  rounds_used int not null default 0,
  observations text not null default '',
  copy jsonb not null default
    '{"concept":"","headline":"","subheadline":"","caption":"","cta":"","visualIdeas":"","notes":"","drafts":[]}'
);

create index requests_project_idx on public.requests (project_id);
create index requests_client_idx on public.requests (client_id);
create index requests_assignee_idx on public.requests (assignee_id);

create table public.request_versions (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests (id) on delete cascade,
  label text not null,
  file_name text not null,
  kind text not null default 'image',
  storage_path text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  note text not null default '',
  state public.work_state not null
);

create table public.request_markers (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests (id) on delete cascade,
  index int not null,
  x real not null,
  y real not null,
  body text not null,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false
);

create table public.request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  state public.work_state not null,
  version_label text,
  mention_ids uuid[] not null default '{}',
  parent_id uuid references public.request_comments (id) on delete cascade,
  internal boolean not null default true
);

create table public.request_approvals (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests (id) on delete cascade,
  stage public.work_state not null,
  decision text not null check (decision in ('approved', 'changes_requested')),
  by_id uuid references public.profiles (id) on delete set null,
  at timestamptz not null default now(),
  note text not null default ''
);

create table public.request_adjustments (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests (id) on delete cascade,
  round int not null,
  target text not null,
  comment text not null,
  by_id uuid references public.profiles (id) on delete set null,
  at timestamptz not null default now(),
  billable boolean not null default false
);

create table public.request_activity (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests (id) on delete cascade,
  at timestamptz not null default now(),
  actor_id uuid references public.profiles (id) on delete set null,
  verb text not null,
  detail text not null default ''
);

create index request_versions_req_idx on public.request_versions (request_id);
create index request_markers_req_idx on public.request_markers (request_id);
create index request_comments_req_idx on public.request_comments (request_id);
create index request_approvals_req_idx on public.request_approvals (request_id);
create index request_adjustments_req_idx on public.request_adjustments (request_id);
create index request_activity_req_idx on public.request_activity (request_id, at desc);

/* ------------------------------------------- assets, calendar, inbox --- */

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  category text not null default 'documents',
  name text not null,
  kind text not null default 'doc',
  storage_path text,
  url text,
  added_by uuid references public.profiles (id) on delete set null,
  added_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  date timestamptz not null,
  kind text not null check (kind in ('deadline', 'delivery', 'publish', 'meeting', 'campaign')),
  title text not null,
  client_id uuid references public.clients (id) on delete cascade,
  request_id text references public.requests (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  kind text not null check (kind in ('assignment', 'mention', 'approval', 'adjustment', 'deadline', 'status')),
  body text not null,
  href text not null,
  read boolean not null default false,
  for_user_id uuid not null references public.profiles (id) on delete cascade
);

create index notifications_user_idx on public.notifications (for_user_id, at desc);

/* --------------------------------------------------------------- RLS --- */

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.requests enable row level security;
alter table public.request_counters enable row level security;
alter table public.request_versions enable row level security;
alter table public.request_markers enable row level security;
alter table public.request_comments enable row level security;
alter table public.request_approvals enable row level security;
alter table public.request_adjustments enable row level security;
alter table public.request_activity enable row level security;
alter table public.assets enable row level security;
alter table public.calendar_events enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "profiles read" on public.profiles for select to authenticated
  using (public.work_is_staff() or id = auth.uid());
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.work_is_admin())
  with check (id = auth.uid() or public.work_is_admin());
create policy "profiles admin delete" on public.profiles for delete to authenticated
  using (public.work_is_admin() and id <> auth.uid());

-- clients / projects / assets / calendar: staff full, clients read their own
create policy "clients staff" on public.clients for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());
create policy "clients own read" on public.clients for select to authenticated
  using (id = public.work_my_client());

create policy "projects staff" on public.projects for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());
create policy "projects own read" on public.projects for select to authenticated
  using (client_id = public.work_my_client());

create policy "assets staff" on public.assets for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());
create policy "assets own read" on public.assets for select to authenticated
  using (client_id = public.work_my_client());

create policy "calendar staff" on public.calendar_events for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());
create policy "calendar own read" on public.calendar_events for select to authenticated
  using (client_id = public.work_my_client());

-- requests
create policy "requests staff" on public.requests for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());
create policy "requests own read" on public.requests for select to authenticated
  using (client_id = public.work_my_client());

-- request children: same visibility as the parent request
create or replace function public.work_can_see_request(rid text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.work_is_staff() or exists (
    select 1 from public.requests r
    where r.id = rid and r.client_id = public.work_my_client()
  )
$$;

do $$
declare t text;
begin
  foreach t in array array['request_versions', 'request_markers', 'request_comments',
                           'request_approvals', 'request_adjustments', 'request_activity'] loop
    execute format(
      'create policy "%1$s staff" on public.%1$I for all to authenticated
         using (public.work_is_staff()) with check (public.work_is_staff())', t);
    execute format(
      'create policy "%1$s own read" on public.%1$I for select to authenticated
         using (public.work_can_see_request(request_id))', t);
  end loop;
end $$;

-- clients may leave comments on their own requests
create policy "request_comments client insert" on public.request_comments for insert to authenticated
  with check (author_id = auth.uid() and public.work_can_see_request(request_id) and not internal);

-- notifications
create policy "notifications own" on public.notifications for select to authenticated
  using (for_user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated
  using (for_user_id = auth.uid()) with check (for_user_id = auth.uid());
create policy "notifications own delete" on public.notifications for delete to authenticated
  using (for_user_id = auth.uid());
create policy "notifications staff insert" on public.notifications for insert to authenticated
  with check (public.work_is_staff());

grant execute on function public.work_next_request_id() to authenticated;

/* ----------------------------------------------------------- storage --- */

insert into storage.buckets (id, name, public, file_size_limit)
values ('work', 'work', false, 52428800)
on conflict (id) do nothing;

create policy "work files staff read" on storage.objects for select to authenticated
  using (bucket_id = 'work' and public.work_is_staff());
create policy "work files staff write" on storage.objects for insert to authenticated
  with check (bucket_id = 'work' and public.work_is_staff());
create policy "work files staff update" on storage.objects for update to authenticated
  using (bucket_id = 'work' and public.work_is_staff());
create policy "work files staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'work' and public.work_is_staff());
