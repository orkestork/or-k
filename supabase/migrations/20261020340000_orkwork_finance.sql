-- OR-K WORK — finance: recurring costs, expenses, income and monthly budgets.

create or replace function public.work_sees_finance()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.work_my_role() in ('super_admin', 'agency_director', 'finance'), false)
$$;

-- Fixed / recurring costs (rent, utilities, software…).
create table public.fin_recurring (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  vendor text not null default '',
  amount numeric(14, 2) not null check (amount >= 0),
  frequency text not null default 'monthly' check (frequency in ('monthly', 'quarterly', 'semiannual', 'annual')),
  due_day int not null default 1 check (due_day between 1 and 31),
  -- first month it applies (for quarterly/annual it anchors the cycle)
  start_on date not null default date_trunc('month', current_date)::date,
  end_on date,
  active boolean not null default true,
  notes text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Actual spending.
create table public.fin_expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  category text not null,
  vendor text not null default '',
  description text not null default '',
  amount numeric(14, 2) not null check (amount >= 0),
  recurring_id uuid references public.fin_recurring (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  paid boolean not null default true,
  receipt_path text,
  receipt_name text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index fin_expenses_date_idx on public.fin_expenses (spent_on desc);
create index fin_expenses_project_idx on public.fin_expenses (project_id);

-- Income from clients (quotes, invoices, payments).
create table public.fin_income (
  id uuid primary key default gen_random_uuid(),
  issued_on date not null default current_date,
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  description text not null default '',
  invoice_number text not null default '',
  amount numeric(14, 2) not null check (amount >= 0),
  status text not null default 'invoiced' check (status in ('quoted', 'invoiced', 'paid')),
  paid_on date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index fin_income_date_idx on public.fin_income (issued_on desc);
create index fin_income_project_idx on public.fin_income (project_id);

-- Monthly budget per category.
create table public.fin_budgets (
  year int not null,
  month int not null check (month between 1 and 12),
  category text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  primary key (year, month, category)
);

do $$
declare t text;
begin
  foreach t in array array['fin_recurring', 'fin_expenses', 'fin_income', 'fin_budgets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s finance" on public.%1$I for all to authenticated
         using (public.work_sees_finance()) with check (public.work_sees_finance())', t);
  end loop;
end $$;

-- Finance can read the HR files it needs for payroll (already allowed via
-- work_sees_pay) and the time entries for project profitability.
drop policy if exists "time staff read" on public.time_entries;
create policy "time staff read" on public.time_entries for select to authenticated
  using (
    public.work_is_staff()
    and (public.work_sees_all() or public.work_sees_finance() or user_id = auth.uid() or public.work_can_see_request(request_id))
  );

-- Receipts live under finance/ in the private bucket.
create or replace function public.work_can_see_path(path text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case (storage.foldername(path))[1]
    when 'requests' then public.work_can_see_request((storage.foldername(path))[2])
    when 'minutes' then public.work_can_see_request((storage.foldername(path))[2])
    when 'clients' then
      case when (storage.foldername(path))[2] = 'pending' then public.work_sees_all()
           else public.work_can_see_client(nullif((storage.foldername(path))[2], '')::uuid) end
    when 'hr' then public.work_is_hr() or (storage.foldername(path))[2] = auth.uid()::text
    when 'finance' then public.work_sees_finance()
    else public.work_sees_all()
  end
$$;
