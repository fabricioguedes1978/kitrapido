DROP POLICY IF EXISTS "members manage" ON public.event_members;

CREATE POLICY "members insert by manager"
ON public.event_members
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    role = 'attendant'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.event_members manager
      WHERE manager.event_id = event_members.event_id
        AND manager.user_id = auth.uid()
        AND manager.role = 'organizer'::public.app_role
    )
  )
);

CREATE POLICY "members update by manager"
ON public.event_members
FOR UPDATE TO authenticated
USING (public.can_manage_event(event_id))
WITH CHECK (
  public.is_admin()
  OR (
    role = 'attendant'::public.app_role
    AND EXISTS (
      SELECT 1 FROM public.event_members manager
      WHERE manager.event_id = event_members.event_id
        AND manager.user_id = auth.uid()
        AND manager.role = 'organizer'::public.app_role
    )
  )
);

CREATE POLICY "members delete by manager"
ON public.event_members
FOR DELETE TO authenticated
USING (public.can_manage_event(event_id));