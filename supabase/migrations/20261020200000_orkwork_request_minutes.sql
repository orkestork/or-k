-- OR-K WORK — meeting minutes ("actas") on requests.

create table public.request_minutes (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests (id) on delete cascade,
  title text not null,
  held_on date not null default current_date,
  attendee_ids uuid[] not null default '{}',
  external_attendees text not null default '',
  summary text not null default '',
  -- [{ "text": "...", "ownerId": uuid|null, "due": "YYYY-MM-DD"|null, "done": bool }]
  agreements jsonb not null default '[]',
  next_steps text not null default '',
  file_path text,
  file_name text,
  visible_to_client boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index request_minutes_req_idx on public.request_minutes (request_id, held_on desc);

alter table public.request_minutes enable row level security;

create policy "request_minutes staff" on public.request_minutes for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());
create policy "request_minutes client read" on public.request_minutes for select to authenticated
  using (visible_to_client and public.work_can_see_request(request_id));
