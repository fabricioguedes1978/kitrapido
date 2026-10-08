ALTER POLICY correction_insert ON public.athlete_correction_requests WITH CHECK (
  public.has_event_access(event_id)
  AND (public.is_admin() OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = athlete_correction_requests.event_id AND (e.athletes_lock_at IS NULL OR e.athletes_lock_at > now())))
  AND requested_by = auth.uid()
  AND status = 'pending'
  AND resolved_at IS NULL AND resolved_by IS NULL AND resolved_by_name IS NULL AND resolution_note IS NULL
  AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_correction_requests.athlete_id AND a.event_id = athlete_correction_requests.event_id)
  AND requested_by_name = (SELECT p.name FROM public.profiles p WHERE p.id = auth.uid())
);