-- OR-K WORK — time off (vacations, sick leave…) with a substitute.

create table public.member_absences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('vacation', 'sick', 'leave', 'other')),
  start_on date not null,
  end_on date not null,
  substitute_id uuid references public.profiles (id) on delete set null,
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_on >= start_on),
  check (substitute_id is distinct from user_id)
);

create index member_absences_user_idx on public.member_absences (user_id, end_on desc);

alter table public.member_absences enable row level security;

create policy "absences staff read" on public.member_absences for select to authenticated
  using (public.work_is_staff());
create policy "absences own or admin write" on public.member_absences for all to authenticated
  using (public.work_is_staff() and (user_id = auth.uid() or public.work_is_admin()))
  with check (public.work_is_staff() and (user_id = auth.uid() or public.work_is_admin()));

-- Who covers this person today (null when they're in).
create or replace function public.work_substitute_of(uid uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select substitute_id from public.member_absences
  where user_id = uid and current_date between start_on and end_on
  order by start_on desc limit 1
$$;
