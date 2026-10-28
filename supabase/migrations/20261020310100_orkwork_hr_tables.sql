-- OR-K WORK — HR tables (the 'hr' role is added in the previous migration so
-- it is committed before these policies reference it).

/* ----------------------------------------------------------- helpers --- */

-- HR staff and admins manage employee files; finance can read pay data.
create or replace function public.work_is_hr()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.work_my_role() in ('super_admin', 'agency_director', 'hr'), false)
$$;

create or replace function public.work_sees_pay()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.work_my_role() in ('super_admin', 'agency_director', 'hr', 'finance'), false)
$$;

-- The signed-in person is uid's direct manager.
create or replace function public.work_manages(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and manager_id = auth.uid())
$$;

/* ------------------------------------------------------ employee file --- */

create table public.hr_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- personal
  document_type text not null default 'CC',
  document_number text not null default '',
  birth_date date,
  phone text not null default '',
  personal_email text not null default '',
  address text not null default '',
  city text not null default '',
  emergency_name text not null default '',
  emergency_relation text not null default '',
  emergency_phone text not null default '',
  -- contract
  contract_type text not null default 'indefinite'
    check (contract_type in ('indefinite', 'fixed', 'services', 'apprentice', 'freelance')),
  start_date date,
  end_date date,
  salary numeric(14, 2),
  salary_period text not null default 'monthly' check (salary_period in ('monthly', 'hourly', 'project')),
  -- social security (Colombia)
  eps text not null default '',
  pension_fund text not null default '',
  arl text not null default '',
  compensation_fund text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.hr_profiles enable row level security;

create policy "hr read own or hr" on public.hr_profiles for select to authenticated
  using (user_id = auth.uid() or public.work_is_hr() or public.work_sees_pay());
create policy "hr write hr" on public.hr_profiles for insert to authenticated
  with check (public.work_is_hr() or user_id = auth.uid());
create policy "hr update own or hr" on public.hr_profiles for update to authenticated
  using (public.work_is_hr() or user_id = auth.uid())
  with check (public.work_is_hr() or user_id = auth.uid());

-- Employees may keep their personal/contact data current; contract, pay and
-- social security are HR's.
create or replace function public.work_guard_hr_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.work_is_hr() and (
    tg_op = 'INSERT' and (new.salary is not null or new.start_date is not null or new.end_date is not null)
    or tg_op = 'UPDATE' and (
      new.contract_type is distinct from old.contract_type or new.start_date is distinct from old.start_date or
      new.end_date is distinct from old.end_date or new.salary is distinct from old.salary or
      new.salary_period is distinct from old.salary_period or new.eps is distinct from old.eps or
      new.pension_fund is distinct from old.pension_fund or new.arl is distinct from old.arl or
      new.compensation_fund is distinct from old.compensation_fund or new.notes is distinct from old.notes or
      new.document_number is distinct from old.document_number or new.document_type is distinct from old.document_type
    )
  ) then
    raise exception 'Solo Talento humano puede cambiar contrato, salario, documento o seguridad social';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger work_guard_hr_profile
  before insert or update on public.hr_profiles
  for each row execute function public.work_guard_hr_profile();

/* --------------------------------------------------------- documents --- */

create table public.hr_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null default 'other'
    check (category in ('contract', 'id', 'certificate', 'social_security', 'payroll', 'other')),
  name text not null,
  storage_path text not null,
  size bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index hr_documents_user_idx on public.hr_documents (user_id);
alter table public.hr_documents enable row level security;

create policy "hr docs read" on public.hr_documents for select to authenticated
  using (user_id = auth.uid() or public.work_is_hr());
create policy "hr docs write" on public.hr_documents for insert to authenticated
  with check (public.work_is_hr() or user_id = auth.uid());
create policy "hr docs delete" on public.hr_documents for delete to authenticated
  using (public.work_is_hr());

/* ---------------------------------------------- time-off requests --- */

alter table public.member_absences
  add column if not exists status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists decided_by uuid references public.profiles (id) on delete set null,
  add column if not exists decided_at timestamptz;

-- Managers and HR can approve/reject their people's requests.
drop policy if exists "absences own or admin write" on public.member_absences;
create policy "absences insert" on public.member_absences for insert to authenticated
  with check (public.work_is_staff() and (user_id = auth.uid() or public.work_is_admin() or public.work_is_hr()));
create policy "absences update" on public.member_absences for update to authenticated
  using (public.work_is_staff() and (user_id = auth.uid() or public.work_is_admin() or public.work_is_hr() or public.work_manages(user_id)))
  with check (public.work_is_staff());
create policy "absences delete" on public.member_absences for delete to authenticated
  using (public.work_is_staff() and (user_id = auth.uid() or public.work_is_admin() or public.work_is_hr()));

-- An employee can't approve their own request.
create or replace function public.work_guard_absence()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' and not (public.work_is_admin() or public.work_is_hr()) and new.user_id = auth.uid() then
    new.status := 'pending';
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not (public.work_is_admin() or public.work_is_hr() or public.work_manages(new.user_id)) then
      raise exception 'Solo su jefe directo o Talento humano pueden aprobar esta solicitud';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
  end if;
  return new;
end;
$$;

create trigger work_guard_absence
  before insert or update on public.member_absences
  for each row execute function public.work_guard_absence();

-- Only approved time off makes someone "away".
create or replace function public.work_substitute_of(uid uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select substitute_id from public.member_absences
  where user_id = uid and status = 'approved' and current_date between start_on and end_on
  order by start_on desc limit 1
$$;

/* ----------------------------------------------------------- storage --- */

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
    else public.work_sees_all()
  end
$$;
