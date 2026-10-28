-- OR-K WORK — reporting lines (org chart).

alter table public.profiles
  add column if not exists manager_id uuid references public.profiles (id) on delete set null;

create index if not exists profiles_manager_idx on public.profiles (manager_id);

-- Reporting lines are governance: only admins change them, and they can't loop.
create or replace function public.work_guard_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  cursor_id uuid;
  hops int := 0;
begin
  if auth.uid() is not null and not public.work_is_admin() and (
    new.role is distinct from old.role or
    new.active is distinct from old.active or
    new.client_id is distinct from old.client_id or
    new.email is distinct from old.email or
    new.manager_id is distinct from old.manager_id
  ) then
    raise exception 'Solo un administrador puede cambiar roles, accesos o jefes directos';
  end if;

  if new.manager_id is not null and new.manager_id is distinct from old.manager_id then
    if new.manager_id = new.id then
      raise exception 'Una persona no puede ser su propio jefe';
    end if;
    cursor_id := new.manager_id;
    while cursor_id is not null and hops < 50 loop
      if cursor_id = new.id then
        raise exception 'Ese cambio crea un ciclo en el organigrama';
      end if;
      select manager_id into cursor_id from public.profiles where id = cursor_id;
      hops := hops + 1;
    end loop;
  end if;
  return new;
end;
$$;
