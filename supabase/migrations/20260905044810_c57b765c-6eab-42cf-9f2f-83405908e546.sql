-- Permitir que gerentes criem eventos
DROP POLICY IF EXISTS "events insert admin" ON public.events;
CREATE POLICY "events insert admin or organizer" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'organizer'));

-- Vincular automaticamente o criador como gerente do evento
CREATE OR REPLACE FUNCTION public.handle_new_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.event_members (event_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'organizer')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_add_creator_member ON public.events;
CREATE TRIGGER events_add_creator_member
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.handle_new_event();