-- OR-K WORK — need-to-know access for production roles.
-- Management roles keep seeing the whole operation. Everyone else on the team
-- only sees the requests they work on (or whose project team they belong to),
-- plus the clients/projects/files those requests belong to.

/* ----------------------------------------------------------- helpers --- */

create or replace function public.work_sees_all()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.work_my_role() in (
    'super_admin', 'agency_director', 'creative_director', 'art_director', 'strategy_director',
    'operations_director', 'finance', 'account_director', 'account_manager', 'project_manager',
    'producer', 'product_manager', 'tech_lead'
  ), false)
$$;

-- The signed-in team member takes part in this request (directly or through
-- the project team).
create or replace function public.work_involved(rid text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.requests r
    left join public.projects p on p.id = r.project_id
    where r.id = rid
      and (
        r.assignee_id = auth.uid()
        or auth.uid() = any (r.collaborator_ids)
        or r.approver_id = auth.uid()
        or r.created_by = auth.uid()
        or p.lead_id = auth.uid()
        or auth.uid() = any (p.team_ids)
        or exists (select 1 from public.request_subtasks s where s.request_id = r.id and s.assignee_id = auth.uid())
      )
  )
$$;

create or replace function public.work_can_see_request(rid text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.work_sees_all()
    or (public.work_is_staff() and public.work_involved(rid))
    or exists (select 1 from public.requests r where r.id = rid and r.client_id = public.work_my_client())
$$;

create or replace function public.work_can_see_project(pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.work_sees_all()
    or (
      public.work_is_staff() and exists (
        select 1 from public.projects p
        where p.id = pid
          and (p.lead_id = auth.uid() or auth.uid() = any (p.team_ids)
               or exists (select 1 from public.requests r where r.project_id = p.id and public.work_involved(r.id)))
      )
    )
$$;

create or replace function public.work_can_see_client(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.work_sees_all()
    or (
      public.work_is_staff() and exists (
        select 1 from public.clients c
        where c.id = cid
          and (c.account_manager_id = auth.uid() or auth.uid() = any (c.team_ids)
               or exists (select 1 from public.projects p where p.client_id = c.id and public.work_can_see_project(p.id)))
      )
    )
$$;

/* ---------------------------------------------------------- requests --- */

drop policy if exists "requests staff" on public.requests;
create policy "requests staff read" on public.requests for select to authenticated
  using (public.work_is_staff() and public.work_can_see_request(id));
create policy "requests staff insert" on public.requests for insert to authenticated
  with check (public.work_is_staff() and public.work_can_see_project(project_id));
create policy "requests staff update" on public.requests for update to authenticated
  using (public.work_is_staff() and public.work_can_see_request(id))
  with check (public.work_is_staff());
create policy "requests manager delete" on public.requests for delete to authenticated
  using (public.work_sees_all());

/* ------------------------------------------------- request children --- */

do $$
declare t text;
begin
  foreach t in array array['request_versions', 'request_markers', 'request_comments', 'request_approvals',
                           'request_adjustments', 'request_activity', 'request_files', 'request_minutes',
                           'request_subtasks'] loop
    execute format('drop policy if exists "%1$s staff" on public.%1$I', t);
    execute format(
      'create policy "%1$s staff" on public.%1$I for all to authenticated
         using (public.work_is_staff() and public.work_can_see_request(request_id))
         with check (public.work_is_staff() and public.work_can_see_request(request_id))', t);
  end loop;
end $$;

drop policy if exists "time staff read" on public.time_entries;
create policy "time staff read" on public.time_entries for select to authenticated
  using (public.work_is_staff() and (public.work_sees_all() or user_id = auth.uid() or public.work_can_see_request(request_id)));
drop policy if exists "time own write" on public.time_entries;
create policy "time own write" on public.time_entries for insert to authenticated
  with check (public.work_is_staff() and public.work_can_see_request(request_id) and (user_id = auth.uid() or public.work_is_admin()));

/* ---------------------------------------------- clients and projects --- */

drop policy if exists "clients staff" on public.clients;
create policy "clients staff read" on public.clients for select to authenticated
  using (public.work_is_staff() and public.work_can_see_client(id));
create policy "clients manager write" on public.clients for all to authenticated
  using (public.work_sees_all()) with check (public.work_sees_all());

drop policy if exists "projects staff" on public.projects;
create policy "projects staff read" on public.projects for select to authenticated
  using (public.work_is_staff() and public.work_can_see_project(id));
create policy "projects manager write" on public.projects for all to authenticated
  using (public.work_sees_all()) with check (public.work_sees_all());

drop policy if exists "assets staff" on public.assets;
create policy "assets staff" on public.assets for all to authenticated
  using (public.work_is_staff() and public.work_can_see_client(client_id))
  with check (public.work_is_staff() and public.work_can_see_client(client_id));

drop policy if exists "docs staff" on public.client_docs;
create policy "docs staff" on public.client_docs for all to authenticated
  using (public.work_is_staff() and public.work_can_see_client(client_id))
  with check (public.work_is_staff() and public.work_can_see_client(client_id));

drop policy if exists "calendar staff" on public.calendar_events;
create policy "calendar staff" on public.calendar_events for all to authenticated
  using (public.work_is_staff() and (client_id is null or public.work_can_see_client(client_id)))
  with check (public.work_is_staff() and (client_id is null or public.work_can_see_client(client_id)));

/* -------------------------------------------- management-only tools --- */

drop policy if exists "templates staff" on public.project_templates;
create policy "templates managers" on public.project_templates for all to authenticated
  using (public.work_sees_all()) with check (public.work_sees_all());

drop policy if exists "recurrences staff" on public.recurrences;
create policy "recurrences managers" on public.recurrences for all to authenticated
  using (public.work_sees_all()) with check (public.work_sees_all());

drop policy if exists "automations read" on public.automations;
create policy "automations read" on public.automations for select to authenticated
  using (public.work_sees_all());

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
    else public.work_sees_all()
  end
$$;

drop policy if exists "work files staff read" on storage.objects;
drop policy if exists "work files staff write" on storage.objects;
drop policy if exists "work files staff update" on storage.objects;
drop policy if exists "work files staff delete" on storage.objects;
create policy "work files staff read" on storage.objects for select to authenticated
  using (bucket_id = 'work' and public.work_is_staff() and public.work_can_see_path(name));
create policy "work files staff write" on storage.objects for insert to authenticated
  with check (bucket_id = 'work' and public.work_is_staff() and public.work_can_see_path(name));
create policy "work files staff update" on storage.objects for update to authenticated
  using (bucket_id = 'work' and public.work_is_staff() and public.work_can_see_path(name));
create policy "work files staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'work' and public.work_is_staff() and public.work_can_see_path(name));
