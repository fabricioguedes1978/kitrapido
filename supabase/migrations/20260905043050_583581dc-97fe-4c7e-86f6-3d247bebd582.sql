-- Only admins may delete events
DROP POLICY IF EXISTS "events delete managers" ON public.events;
CREATE POLICY "events delete admin" ON public.events FOR DELETE TO authenticated USING (public.is_admin());

-- Block non-admins from changing the archived flag
CREATE OR REPLACE FUNCTION public.guard_event_archived()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.archived IS DISTINCT FROM OLD.archived AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente o administrador pode inativar ou reativar um evento';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_guard_archived ON public.events;
CREATE TRIGGER events_guard_archived
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.guard_event_archived();

-- Staff (attendants) can cancel deliveries in their event
DROP POLICY IF EXISTS "deliveries update managers" ON public.deliveries;
CREATE POLICY "deliveries update staff" ON public.deliveries
FOR UPDATE TO authenticated
USING (public.has_event_access(event_id))
WITH CHECK (public.has_event_access(event_id));