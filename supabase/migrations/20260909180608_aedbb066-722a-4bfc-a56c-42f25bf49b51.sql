DROP POLICY IF EXISTS "tpa manage" ON public.third_party_authorizations;

CREATE POLICY "tpa insert staff"
ON public.third_party_authorizations
FOR INSERT TO authenticated
WITH CHECK (has_event_access(event_id));

CREATE POLICY "tpa update staff"
ON public.third_party_authorizations
FOR UPDATE TO authenticated
USING (has_event_access(event_id))
WITH CHECK (has_event_access(event_id));

CREATE OR REPLACE FUNCTION public.guard_tpa_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT can_manage_event(OLD.event_id) THEN
    RAISE EXCEPTION 'Somente administrador ou gerente pode alterar o status da autorização.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_tpa_status ON public.third_party_authorizations;
CREATE TRIGGER guard_tpa_status
BEFORE UPDATE ON public.third_party_authorizations
FOR EACH ROW EXECUTE FUNCTION public.guard_tpa_status_change();