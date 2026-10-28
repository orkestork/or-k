-- OR-K WORK — yearly payroll parameters (minimum wage, transport allowance…).

create table public.org_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.org_settings enable row level security;
create policy "settings staff read" on public.org_settings for select to authenticated using (public.work_is_staff());
create policy "settings hr write" on public.org_settings for all to authenticated
  using (public.work_is_hr()) with check (public.work_is_hr());

-- Colombian 2025 figures as a starting point; HR updates them each January.
insert into public.org_settings (key, value) values
  ('payroll', '{"year": 2025, "minimumWage": 1423500, "transportAllowance": 200000, "exempt": true}')
on conflict (key) do nothing;
