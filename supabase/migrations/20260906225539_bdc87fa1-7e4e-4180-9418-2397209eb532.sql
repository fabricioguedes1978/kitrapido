ALTER TABLE public.events ADD COLUMN IF NOT EXISTS allow_organizer_import boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_organizer_import()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.allow_organizer_import IS DISTINCT FROM OLD.allow_organizer_import AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente o administrador pode autorizar o envio de planilha pelo gerente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_guard_organizer_import ON public.events;
CREATE TRIGGER events_guard_organizer_import
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.guard_organizer_import();

CREATE OR REPLACE FUNCTION public.can_import_athletes(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
      OR (
        public.can_edit_athletes(_event_id)
        AND COALESCE((SELECT e.allow_organizer_import FROM public.events e WHERE e.id = _event_id), false)
      )
$$;