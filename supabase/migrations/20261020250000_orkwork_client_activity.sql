-- OR-K WORK — clients only see client-safe activity.
-- Some entries carry internal detail (comment snippets, copy drafts, hours…),
-- so the client read policy is limited to milestones they should follow.

drop policy if exists "request_activity own read" on public.request_activity;

create policy "request_activity own read" on public.request_activity for select to authenticated
  using (
    public.work_can_see_request(request_id)
    and (
      public.work_is_staff()
      or verb in ('creó la solicitud', 'creó la solicitud desde el portal', 'movió a', 'subió',
                  'aprobó en', 'pidió cambios en', 'pidió ajustes', 'adjuntó', 'reprogramó')
    )
  );
