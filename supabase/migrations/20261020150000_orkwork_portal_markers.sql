-- OR-K WORK — client portal + markers on pieces.

/* ------------------------------------------------------------ markers --- */

alter table public.request_markers
  add column if not exists version_id uuid references public.request_versions (id) on delete cascade;

-- Clients can pin feedback on pieces of their own requests.
create policy "request_markers client insert" on public.request_markers for insert to authenticated
  with check (author_id = auth.uid() and public.work_can_see_request(request_id));

/* ----------------------------------------------- comment visibility --- */

-- Internal comments never reach client users.
drop policy if exists "request_comments own read" on public.request_comments;
create policy "request_comments own read" on public.request_comments for select to authenticated
  using (public.work_can_see_request(request_id) and (public.work_is_staff() or not internal));

/* ------------------------------------------------- client file access --- */

-- Clients read the version files of their own requests: requests/<id>/<file>.
create policy "work files client read" on storage.objects for select to authenticated
  using (
    bucket_id = 'work'
    and (storage.foldername(name))[1] = 'requests'
    and public.work_can_see_request((storage.foldername(name))[2])
  );

/* --------------------------------------------- client approval flow --- */

create or replace function public.work_client_decide(rid text, decision text, note text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  r public.requests;
  me uuid := auth.uid();
  next_round int;
  am uuid;
begin
  select * into r from public.requests where id = rid for update;
  if r.id is null
     or public.work_my_role() is distinct from 'client'
     or r.client_id is distinct from public.work_my_client() then
    raise exception 'Sin acceso a esta solicitud';
  end if;
  if r.state <> 'client_review' then
    raise exception 'Esta pieza no está esperando tu revisión';
  end if;

  insert into public.request_approvals (request_id, stage, decision, by_id, note)
  values (rid, 'client_review', decision, me, coalesce(note, ''));

  if decision = 'approved' then
    update public.requests set state = 'approved', updated_at = now() where id = rid;
    insert into public.request_activity (request_id, actor_id, verb, detail)
    values (rid, me, 'aprobó en', 'Revisión del cliente');
  elsif decision = 'changes_requested' then
    if coalesce(trim(note), '') = '' then
      raise exception 'Cuéntanos qué hay que ajustar';
    end if;
    next_round := r.rounds_used + 1;
    insert into public.request_adjustments (request_id, round, target, comment, by_id, billable)
    values (rid, next_round, 'other', note, me, next_round > r.rounds_included);
    update public.requests
      set state = 'adjustments', rounds_used = next_round, updated_at = now()
      where id = rid;
    insert into public.request_activity (request_id, actor_id, verb, detail)
    values (rid, me, 'pidió ajustes', format('Ronda %s/%s', next_round, r.rounds_included));
  else
    raise exception 'Decisión no válida';
  end if;

  select account_manager_id into am from public.clients where id = r.client_id;
  insert into public.notifications (for_user_id, kind, body, href)
  select distinct x,
    case when decision = 'approved' then 'approval' else 'adjustment' end,
    format('El cliente %s %s', case when decision = 'approved' then 'aprobó' else 'pidió ajustes en' end, rid),
    '/work/requests/' || rid
  from unnest(array[r.assignee_id, r.created_by, am]) as x
  where x is not null;
end;
$$;

grant execute on function public.work_client_decide(text, text, text) to authenticated;

/* ------------------------------- client → team inbox notifications --- */

-- Clients cannot write notifications directly; this tells the request's
-- team (assignee, creator, account manager) about client feedback.
create or replace function public.work_notify_request_team(rid text, kind text, body text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  r public.requests;
  am uuid;
begin
  if not public.work_can_see_request(rid) then
    raise exception 'Sin acceso a esta solicitud';
  end if;
  select * into r from public.requests where id = rid;
  select account_manager_id into am from public.clients where id = r.client_id;
  insert into public.notifications (for_user_id, kind, body, href)
  select distinct x, kind, left(body, 200), '/work/requests/' || rid
  from unnest(array[r.assignee_id, r.created_by, am]) as x
  where x is not null and x <> auth.uid();
end;
$$;

grant execute on function public.work_notify_request_team(text, text, text) to authenticated;

/* -------------------------------------- clients see who they talk to --- */

create policy "profiles staff visible to clients" on public.profiles for select to authenticated
  using (public.work_my_client() is not null and role <> 'client' and active);
