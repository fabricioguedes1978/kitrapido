ALTER TABLE public.athlete_correction_requests
  DROP CONSTRAINT athlete_correction_requests_event_id_fkey,
  DROP CONSTRAINT athlete_correction_requests_athlete_id_fkey,
  ADD CONSTRAINT athlete_correction_requests_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  ADD CONSTRAINT athlete_correction_requests_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;
COMMENT ON CONSTRAINT athlete_correction_requests_event_id_fkey ON public.athlete_correction_requests IS 'Correction requests follow deliberate event deletion; audit logs retain their existing independent history.';
COMMENT ON CONSTRAINT athlete_correction_requests_athlete_id_fkey ON public.athlete_correction_requests IS 'Correction requests follow deliberate athlete deletion to avoid blocking existing roster deletion flows.';