ALTER TABLE public.events ADD COLUMN IF NOT EXISTS athletes_lock_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_default_athletes_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.athletes_lock_at IS NULL AND NEW.event_date IS NOT NULL THEN
    NEW.athletes_lock_at := ((NEW.event_date::timestamp + COALESCE(NEW.event_time, '00:00'::time)) - interval '24 hours') AT TIME ZONE 'America/Sao_Paulo';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_default_athletes_lock ON public.events;
CREATE TRIGGER events_default_athletes_lock
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_default_athletes_lock();

UPDATE public.events
SET athletes_lock_at = ((event_date::timestamp + COALESCE(event_time, '00:00'::time)) - interval '24 hours') AT TIME ZONE 'America/Sao_Paulo'
WHERE athletes_lock_at IS NULL AND event_date IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_athletes_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.athletes_lock_at IS DISTINCT FROM OLD.athletes_lock_at AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente o administrador pode alterar o prazo de cadastro de atletas';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_guard_athletes_lock ON public.events;
CREATE TRIGGER events_guard_athletes_lock
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.guard_athletes_lock();

CREATE OR REPLACE FUNCTION public.can_edit_athletes(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
      OR (
        public.can_manage_event(_event_id)
        AND COALESCE(
              (SELECT e.athletes_lock_at FROM public.events e WHERE e.id = _event_id) > now(),
              true
            )
      )
$$;

DROP POLICY IF EXISTS "athletes manage" ON public.athletes;
CREATE POLICY "athletes manage" ON public.athletes
FOR ALL TO authenticated
USING (public.can_edit_athletes(event_id))
WITH CHECK (public.can_edit_athletes(event_id));