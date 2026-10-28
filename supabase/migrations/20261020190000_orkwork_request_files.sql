-- OR-K WORK — attachments on requests (briefs, references, documents…).
-- Files live in Storage under requests/<request id>/files/, which the
-- existing client read policy already covers for the client's own requests.

create table public.request_files (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests (id) on delete cascade,
  name text not null,
  kind text not null default 'doc',
  size bigint,
  storage_path text not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index request_files_req_idx on public.request_files (request_id);

alter table public.request_files enable row level security;

create policy "request_files staff" on public.request_files for all to authenticated
  using (public.work_is_staff()) with check (public.work_is_staff());
create policy "request_files own read" on public.request_files for select to authenticated
  using (public.work_can_see_request(request_id));
