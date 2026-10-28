-- OR-K WORK — the person who must sign off a request in internal reviews.

alter table public.requests
  add column if not exists approver_id uuid references public.profiles (id) on delete set null;

create index if not exists requests_approver_idx on public.requests (approver_id);
