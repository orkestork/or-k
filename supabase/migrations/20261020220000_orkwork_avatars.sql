-- OR-K WORK — profile photos.
-- Avatars are shown everywhere (lists, boards, client portal), so they live in
-- a public bucket and the profile keeps the public URL.

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- Each person writes only inside avatars/<their id>/; admins can manage anyone's.
create policy "avatars own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.work_is_admin()));
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.work_is_admin()));
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.work_is_admin()));

-- Initial team photos from the public site.
update public.profiles p set avatar_url = t.url
from (values
  ('juan@or-k.co', '/assets/team-avatars/team-01.jpg'),
  ('maureen@or-k.co', '/assets/team-avatars/team-02.jpg'),
  ('andres@or-k.co', '/assets/team-avatars/team-03.jpg'),
  ('luis@or-k.co', '/assets/team-avatars/team-04.jpg'),
  ('admintrador@or-k.com', '/assets/team-avatars/team-05.jpg')
) as t(email, url)
where p.email = t.email and p.avatar_url is null;
