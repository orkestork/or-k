create table public.crm_records (
  id uuid primary key default gen_random_uuid(),
  company text not null check (length(trim(company)) between 1 and 200),
  contact text not null default '', email text not null default '', phone text not null default '',
  stage text not null default 'nuevo' check (stage in ('nuevo','contactado','propuesta','negociacion','ganado','perdido')),
  owner_id uuid references public.profiles(id) on delete set null,
  value numeric(18,2) not null default 0 check (value >= 0),
  follow_up date, notes text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.crm_records enable row level security;
create policy crm_read on public.crm_records for select to authenticated using (public.work_perm('operation') in ('view','edit'));
create policy crm_insert on public.crm_records for insert to authenticated with check (public.work_perm('operation') = 'edit');
create policy crm_update on public.crm_records for update to authenticated using (public.work_perm('operation') = 'edit') with check (public.work_perm('operation') = 'edit');
grant select, insert, update on public.crm_records to authenticated;
create index crm_follow_up_idx on public.crm_records(follow_up);
