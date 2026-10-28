-- OR-K WORK — clients only see the versions the team shares with them.

alter table public.request_versions
  add column if not exists shared boolean not null default false,
  add column if not exists shared_at timestamptz;

-- Keep what clients already reviewed: share versions of requests that already
-- reached the client review.
update public.request_versions v set shared = true, shared_at = now()
from public.requests r
where r.id = v.request_id
  and r.state in ('client_review', 'approved', 'scheduled', 'published', 'completed');

-- Sending a request to the client shares its latest version automatically.
create or replace function public.work_share_on_client_review()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.state = 'client_review' and old.state is distinct from 'client_review' then
    update public.request_versions set shared = true, shared_at = now()
    where id = (
      select id from public.request_versions
      where request_id = new.id order by uploaded_at desc limit 1
    ) and not shared;
  end if;
  return new;
end;
$$;

create trigger work_share_on_client_review
  after update of state on public.requests
  for each row execute function public.work_share_on_client_review();

-- Version rows: staff see all, clients only shared ones.
drop policy if exists "request_versions own read" on public.request_versions;
create policy "request_versions own read" on public.request_versions for select to authenticated
  using (public.work_can_see_request(request_id) and (public.work_is_staff() or shared));

-- Files: a client can read exactly the shared version files and attachments
-- of their requests — nothing else under requests/ (no listing drafts).
drop policy if exists "work files client read" on storage.objects;
create policy "work files client read" on storage.objects for select to authenticated
  using (
    bucket_id = 'work'
    and not public.work_is_staff()
    and (
      exists (
        select 1 from public.request_versions v
        where v.storage_path = storage.objects.name and v.shared and public.work_can_see_request(v.request_id)
      )
      or exists (
        select 1 from public.request_files f
        where f.storage_path = storage.objects.name and public.work_can_see_request(f.request_id)
      )
    )
  );
