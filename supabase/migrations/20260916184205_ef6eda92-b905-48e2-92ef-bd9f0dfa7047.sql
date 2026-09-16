DROP POLICY IF EXISTS "members insert by manager" ON public.event_members;
DROP POLICY IF EXISTS "members update by manager" ON public.event_members;
DROP POLICY IF EXISTS "members delete by manager" ON public.event_members;

CREATE POLICY "members insert by manager"
ON public.event_members
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR (role = 'attendant'::public.app_role AND public.can_manage_event(event_id))
);

CREATE POLICY "members update by manager"
ON public.event_members
FOR UPDATE TO authenticated
USING (
  public.is_admin()
  OR (role = 'attendant'::public.app_role AND public.can_manage_event(event_id))
)
WITH CHECK (
  public.is_admin()
  OR (role = 'attendant'::public.app_role AND public.can_manage_event(event_id))
);

CREATE POLICY "members delete by manager"
ON public.event_members
FOR DELETE TO authenticated
USING (
  public.is_admin()
  OR (role = 'attendant'::public.app_role AND public.can_manage_event(event_id))
);