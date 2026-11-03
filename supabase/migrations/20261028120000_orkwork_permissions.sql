-- OR-K WORK — per-person permissions on top of the role.
-- profiles.permissions overrides the role's default level per module
-- ('none' | 'view' | 'edit'). An empty object keeps the role defaults.
-- super_admin always has full access and clients never get staff modules.

alter table public.profiles
  add column if not exists permissions jsonb not null default '{}'::jsonb;

/* ----------------------------------------------------------- helpers --- */

-- Default level of a module for a role (mirrors roleDefault in lib/work/people.ts).
create or replace function public.work_role_perm(r public.work_role, module text)
returns text
language sql immutable set search_path = public
as $$
  select case module
    when 'operation' then case when r::text in (
      'super_admin', 'agency_director', 'creative_director', 'art_director', 'strategy_director',
      'operations_director', 'finance', 'account_director', 'account_manager', 'project_manager',
      'producer', 'product_manager', 'tech_lead'
    ) then 'edit' else 'none' end
    when 'finance' then case when r::text in ('super_admin', 'agency_director', 'finance') then 'edit' else 'none' end
    when 'hr' then case when r::text in ('super_admin', 'agency_director', 'hr') then 'edit' else 'none' end
    when 'pay' then case when r::text in ('super_admin', 'agency_director', 'hr', 'finance') then 'view' else 'none' end
    when 'team' then case when r::text in ('super_admin', 'agency_director') then 'edit' else 'none' end
    else 'none'
  end
$$;

-- Effective level of a module for the signed-in person.
create or replace function public.work_perm(module text)
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select case
      when p.role = 'super_admin' then 'edit'
      when p.role = 'client' then 'none'
      else coalesce(p.permissions ->> module, public.work_role_perm(p.role, module))
    end
    from public.profiles p
    where p.id = auth.uid() and p.active
  ), 'none')
$$;

create or replace function public.work_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.work_perm('team') = 'edit'
$$;

create or replace function public.work_sees_all()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.work_perm('operation') in ('view', 'edit')
$$;

-- Edits HR files (the existing policies use this for writes).
create or replace function public.work_is_hr()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.work_perm('hr') = 'edit'
$$;

-- Reads every HR file.
create or replace function public.work_hr_reads()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.work_perm('hr') in ('view', 'edit')
$$;

create or replace function public.work_sees_pay()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.work_perm('pay') in ('view', 'edit')
$$;

create or replace function public.work_sees_finance()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.work_perm('finance') in ('view', 'edit')
$$;

/* --------------------------------------------- only super_admin grants --- */

create or replace function public.work_guard_permissions()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null
    and new.permissions is distinct from old.permissions
    and coalesce(public.work_my_role() <> 'super_admin', true) then
    raise exception 'Solo el super admin puede cambiar permisos';
  end if;
  return new;
end;
$$;

drop trigger if exists work_guard_permissions on public.profiles;
create trigger work_guard_permissions
  before update on public.profiles
  for each row execute function public.work_guard_permissions();

/* ------------------------------------------- view vs edit in policies --- */

-- Clients and projects: seeing everything is not enough to change them.
drop policy if exists "clients manager write" on public.clients;
create policy "clients manager write" on public.clients for all to authenticated
  using (public.work_perm('operation') = 'edit') with check (public.work_perm('operation') = 'edit');

drop policy if exists "projects manager write" on public.projects;
create policy "projects manager write" on public.projects for all to authenticated
  using (public.work_perm('operation') = 'edit') with check (public.work_perm('operation') = 'edit');

-- HR readers see every file; writes keep using work_is_hr().
drop policy if exists "hr read own or hr" on public.hr_profiles;
create policy "hr read own or hr" on public.hr_profiles for select to authenticated
  using (user_id = auth.uid() or public.work_hr_reads() or public.work_sees_pay());

drop policy if exists "hr docs read" on public.hr_documents;
create policy "hr docs read" on public.hr_documents for select to authenticated
  using (user_id = auth.uid() or public.work_hr_reads());

-- Finance viewers read but can't write.
do $$
declare t text;
begin
  foreach t in array array['fin_recurring', 'fin_expenses', 'fin_income', 'fin_budgets', 'fin_apps', 'fin_app_plans', 'fin_app_subscribers'] loop
    execute format('drop policy if exists "%1$s finance insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s finance update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s finance delete" on public.%1$I', t);
    execute format(
      'create policy "%1$s finance insert" on public.%1$I as restrictive for insert to authenticated
         with check (public.work_perm(''finance'') = ''edit'')', t);
    execute format(
      'create policy "%1$s finance update" on public.%1$I as restrictive for update to authenticated
         using (public.work_perm(''finance'') = ''edit'')', t);
    execute format(
      'create policy "%1$s finance delete" on public.%1$I as restrictive for delete to authenticated
         using (public.work_perm(''finance'') = ''edit'')', t);
  end loop;
end $$;
