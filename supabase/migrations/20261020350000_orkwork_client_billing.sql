-- OR-K WORK — how each client pays (terms, method, installment plan).

create table public.client_billing (
  client_id uuid primary key references public.clients (id) on delete cascade,
  model text not null default 'project' check (model in ('project', 'retainer', 'hourly')),
  payment_method text not null default 'transfer'
    check (payment_method in ('transfer', 'pse', 'card', 'check', 'cash', 'other')),
  terms_days int not null default 30 check (terms_days between 0 and 180),
  iva_rate numeric(5, 2) not null default 19,
  withholding boolean not null default false,
  contract_value numeric(14, 2),
  installments int not null default 1 check (installments between 1 and 36),
  installment_frequency text not null default 'monthly'
    check (installment_frequency in ('monthly', 'biweekly', 'milestones')),
  -- custom split in %, e.g. {50,50} or {40,30,30}; empty = equal parts
  installment_split numeric[] not null default '{}',
  first_due_on date,
  notes text not null default '',
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.client_billing enable row level security;

-- Management (incl. account managers) and finance see and set billing terms.
create policy "billing read" on public.client_billing for select to authenticated
  using (public.work_sees_all() or public.work_sees_finance());
create policy "billing write" on public.client_billing for all to authenticated
  using (public.work_sees_all() or public.work_sees_finance())
  with check (public.work_sees_all() or public.work_sees_finance());

-- Installments that are planned but not invoiced yet.
alter table public.fin_income drop constraint if exists fin_income_status_check;
alter table public.fin_income add constraint fin_income_status_check
  check (status in ('scheduled', 'quoted', 'invoiced', 'paid'));
alter table public.fin_income add column if not exists installment_no int;
alter table public.fin_income add column if not exists installment_of int;
