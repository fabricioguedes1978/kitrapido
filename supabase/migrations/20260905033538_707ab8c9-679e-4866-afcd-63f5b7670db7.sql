DROP POLICY IF EXISTS "deliveries update admin" ON public.deliveries;
CREATE POLICY "deliveries update managers" ON public.deliveries
FOR UPDATE TO authenticated
USING (is_admin() OR can_manage_event(event_id))
WITH CHECK (is_admin() OR can_manage_event(event_id));