-- OR-K WORK — planning features: timeline dates, dependencies, time tracking,
-- project budgets, templates, client docs, client intake, recurring tasks and
-- state automations. Everything runs inside Postgres (no external services).

/* ------------------------------------------- timeline + dependencies --- */

alter table public.requests
  add column if not exists start_on date,
  add column if not exists depends_on text[] not null default '{}';

-- Existing work gets a start date: the Monday of its deadline week.
update public.requests
set start_on = greatest(created_at::date, (deadline at time zone 'America/Bogota')::date - 4)
where start_on is null;

/* -------------------------------------------- budgets + time tracking --- */

alter table public.projects
  add column if not exists budget_hours numeric(8, 1);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  minutes int not null check (minutes > 0 and minutes <= 24 * 60),
  worked_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index time_entries_req_idx on public.time_entries (request_id);
create index time_entries_user_idx on public.time_entries (user_id, worked_on desc);

alter table public.time_entries enable row level security;

create policy "time staff read" on public.time_entries for select to authenticated
  using (public.work_is_staff());
create policy "time own write" on public.time_entries for insert to authenticated
  with check (public.work_is_staff() and (user_id = auth.uid() or public.work_is_admin()));
create policy "time own update" on public.time_entries for update to authenticated
  using (user_id = auth.uid() or public.work_is_admin());
create policy "time own delete" on public.time_entries for delete to authenticated
  using (user_id = auth.uid() or public.work_is_admin());

/* ---------------------------------------------------- project templates --- */

create table public.project_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  duration_days int not null default 0,
  -- [{ title, campaign, objective, deliverables[], priority, startOffset, endOffset,
  --    assigneeId, collaboratorIds[], subtasks: [{ title, assigneeId, offset }] }]
  tasks jsonb not null default '[]',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.project_templates enable row level security;
create policy "templates staff" on public.project_templates for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());

/* ------------------------------------------------------- client docs --- */

create table public.client_docs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  body text not null default '',
  pinned boolean not null default false,
  visible_to_client boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index client_docs_client_idx on public.client_docs (client_id, pinned desc, updated_at desc);

alter table public.client_docs enable row level security;
create policy "docs staff" on public.client_docs for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());
create policy "docs client read" on public.client_docs for select to authenticated
  using (visible_to_client and client_id = public.work_my_client());

/* --------------------------------------------------- client intake RPC --- */

-- A client asks for new work from the portal. It lands as a Solicitud on one
-- of their projects and pings the account manager.
create or replace function public.work_client_create_request(
  pid uuid, req_title text, req_description text, wanted_on date
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  p public.projects;
  am uuid;
  new_id text;
  me uuid := auth.uid();
begin
  if public.work_my_role() is distinct from 'client' then
    raise exception 'Solo usuarios de cliente pueden usar este formulario';
  end if;
  select * into p from public.projects where id = pid;
  if p.id is null or p.client_id is distinct from public.work_my_client() then
    raise exception 'Proyecto no válido';
  end if;
  if coalesce(trim(req_title), '') = '' then
    raise exception 'Escribe qué necesitas';
  end if;
  select account_manager_id into am from public.clients where id = p.client_id;

  insert into public.requests (client_id, project_id, campaign, title, description, objective,
                               deadline, start_on, assignee_id, created_by, observations)
  values (p.client_id, p.id, p.name, trim(req_title), coalesce(req_description, ''), coalesce(req_description, ''),
          coalesce(wanted_on, current_date + 7)::timestamptz + interval '17 hours', current_date, am, me,
          'Solicitud creada por el cliente desde el portal.')
  returning id into new_id;

  insert into public.request_activity (request_id, actor_id, verb, detail)
  values (new_id, me, 'creó la solicitud desde el portal', trim(req_title));

  if am is not null then
    insert into public.notifications (for_user_id, kind, body, href)
    values (am, 'assignment', format('Nueva solicitud del cliente: %s · %s', new_id, trim(req_title)), '/work/requests/' || new_id);
  end if;
  return new_id;
end;
$$;

grant execute on function public.work_client_create_request(uuid, text, text, date) to authenticated;

/* ---------------------------------------------------- recurring tasks --- */

create table public.recurrences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  objective text not null default '',
  deliverables text[] not null default '{}',
  priority public.work_priority not null default 'medium',
  assignee_id uuid references public.profiles (id) on delete set null,
  collaborator_ids uuid[] not null default '{}',
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  lead_days int not null default 4 check (lead_days >= 0 and lead_days <= 60),
  next_run date not null,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.recurrences enable row level security;
create policy "recurrences staff" on public.recurrences for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());

-- Creates every occurrence that is due. Safe to call from many sessions at
-- once: rows are locked and their next_run advanced in the same transaction.
create or replace function public.work_run_recurrences()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  rec public.recurrences;
  p public.projects;
  created int := 0;
  new_id text;
begin
  if not public.work_is_staff() then
    return 0;
  end if;
  for rec in
    select * from public.recurrences
    where active and next_run <= current_date
    for update skip locked
  loop
    select * into p from public.projects where id = rec.project_id;
    while rec.next_run <= current_date loop
      insert into public.requests (client_id, project_id, campaign, title, description, objective, deliverables,
                                   priority, assignee_id, collaborator_ids, start_on, deadline, created_by)
      values (p.client_id, p.id, p.name,
              format('%s · %s', rec.title, to_char(rec.next_run, 'DD/MM')),
              rec.objective, rec.objective, rec.deliverables, rec.priority, rec.assignee_id, rec.collaborator_ids,
              rec.next_run, (rec.next_run + rec.lead_days)::timestamptz + interval '17 hours', rec.created_by)
      returning id into new_id;
      insert into public.request_activity (request_id, actor_id, verb, detail)
      values (new_id, rec.created_by, 'creó la tarea recurrente', rec.title);
      insert into public.notifications (for_user_id, kind, body, href)
      select distinct x, 'assignment', format('Nueva tarea recurrente: %s', rec.title), '/work/requests/' || new_id
      from unnest(array[rec.assignee_id] || rec.collaborator_ids) as x where x is not null;
      created := created + 1;
      rec.next_run := case rec.frequency
        when 'weekly' then rec.next_run + 7
        when 'biweekly' then rec.next_run + 14
        else (rec.next_run + interval '1 month')::date
      end;
    end loop;
    update public.recurrences set next_run = rec.next_run where id = rec.id;
  end loop;
  return created;
end;
$$;

grant execute on function public.work_run_recurrences() to authenticated;

/* -------------------------------------------------------- automations --- */

create or replace function public.work_state_label(s public.work_state)
returns text
language sql immutable
as $$
  select case s
    when 'request' then 'Solicitud' when 'briefing' then 'Briefing' when 'copy' then 'Copy'
    when 'design' then 'Diseño' when 'copy_review' then 'Revisión de copy'
    when 'creative_review' then 'Dirección creativa' when 'account_review' then 'Revisión de cuenta'
    when 'client_review' then 'Revisión del cliente' when 'adjustments' then 'Ajustes'
    when 'approved' then 'Aprobado' when 'scheduled' then 'Programado' when 'published' then 'Publicado'
    when 'completed' then 'Completado' when 'archived' then 'Archivado'
  end
$$;

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  -- trigger: a request enters this state (optionally only for one project)
  to_state public.work_state not null,
  project_id uuid references public.projects (id) on delete cascade,
  action text not null check (action in ('notify_role', 'notify_user', 'assign_user', 'set_priority')),
  role public.work_role,
  user_id uuid references public.profiles (id) on delete cascade,
  priority public.work_priority,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.automations enable row level security;
create policy "automations read" on public.automations for select to authenticated
  using (public.work_is_staff());
create policy "automations admin write" on public.automations for all to authenticated
  using (public.work_is_admin()) with check (public.work_is_admin());

-- Runs on every state change, whichever path caused it (flow buttons, board,
-- client portal, edits), so rules can't be bypassed.
create or replace function public.work_apply_automations()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  rule public.automations;
begin
  if new.state is not distinct from old.state then
    return new;
  end if;
  for rule in
    select * from public.automations
    where active and to_state = new.state and (project_id is null or project_id = new.project_id)
  loop
    if rule.action = 'assign_user' and rule.user_id is not null then
      new.assignee_id := rule.user_id;
      insert into public.notifications (for_user_id, kind, body, href)
      values (rule.user_id, 'assignment', format('Automatización: se te asignó %s · %s', new.id, new.title), '/work/requests/' || new.id);
    elsif rule.action = 'set_priority' and rule.priority is not null then
      new.priority := rule.priority;
    elsif rule.action = 'notify_user' and rule.user_id is not null then
      insert into public.notifications (for_user_id, kind, body, href)
      values (rule.user_id, 'status', format('%s pasó a %s', new.id, public.work_state_label(new.state)), '/work/requests/' || new.id);
    elsif rule.action = 'notify_role' and rule.role is not null then
      insert into public.notifications (for_user_id, kind, body, href)
      select id, 'status', format('%s · %s pasó a %s', new.id, new.title, public.work_state_label(new.state)), '/work/requests/' || new.id
      from public.profiles where role = rule.role and active;
    end if;
  end loop;
  return new;
end;
$$;

create trigger work_apply_automations
  before update of state on public.requests
  for each row execute function public.work_apply_automations();
