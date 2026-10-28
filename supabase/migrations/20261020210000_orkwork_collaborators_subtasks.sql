-- OR-K WORK — several people on a request + subtasks with their own owner.

-- assignee_id stays as the lead; collaborators share the work.
alter table public.requests
  add column if not exists collaborator_ids uuid[] not null default '{}';

create index if not exists requests_collaborators_idx on public.requests using gin (collaborator_ids);

create table public.request_subtasks (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests (id) on delete cascade,
  title text not null,
  assignee_id uuid references public.profiles (id) on delete set null,
  due_on date,
  done boolean not null default false,
  done_at timestamptz,
  position int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index request_subtasks_req_idx on public.request_subtasks (request_id, position);
create index request_subtasks_assignee_idx on public.request_subtasks (assignee_id) where not done;

alter table public.request_subtasks enable row level security;

create policy "request_subtasks staff" on public.request_subtasks for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());
