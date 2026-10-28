-- OR-K WORK — clients can be switched off without deleting their history.

alter table public.clients add column if not exists active boolean not null default true;
