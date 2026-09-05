CREATE OR REPLACE FUNCTION public.can_manage_event(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.event_members m
                 WHERE m.event_id = _event_id AND m.user_id = auth.uid() AND m.role = 'organizer')
$$;

CREATE OR REPLACE FUNCTION public.has_event_access(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR EXISTS (
           SELECT 1 FROM public.event_members m
           WHERE m.event_id = _event_id AND m.user_id = auth.uid()
             AND (m.role = 'organizer'
                  OR NOT COALESCE((SELECT e.archived FROM public.events e WHERE e.id = _event_id), false))
         )
$$;

DROP POLICY IF EXISTS "events delete admin" ON public.events;
CREATE POLICY "events delete managers" ON public.events
  FOR DELETE TO authenticated
  USING (public.can_manage_event(id));
