-- OR-K WORK — finance: OR-K's own subscription apps (plans and subscribers per month).

create table public.fin_apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  status text not null default 'building' check (status in ('building', 'live', 'paused')),
  launch_on date,
  -- hosting, APIs, stores… what it costs to keep the app running each month
  monthly_cost numeric(14, 2) not null default 0 check (monthly_cost >= 0),
  accent_color text not null default '#e31572',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fin_app_plans (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.fin_apps (id) on delete cascade,
  name text not null,
  price numeric(14, 2) not null check (price >= 0),
  billing text not null default 'monthly' check (billing in ('monthly', 'annual')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index fin_app_plans_app_idx on public.fin_app_plans (app_id);

-- Paying subscribers of a plan in a month (month = first day of the month).
create table public.fin_app_subscribers (
  plan_id uuid not null references public.fin_app_plans (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  subscribers int not null default 0 check (subscribers >= 0),
  primary key (plan_id, month)
);

do $$
declare t text;
begin
  foreach t in array array['fin_apps', 'fin_app_plans', 'fin_app_subscribers'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s finance" on public.%1$I for all to authenticated
         using (public.work_sees_finance()) with check (public.work_sees_finance())', t);
  end loop;
end $$;
