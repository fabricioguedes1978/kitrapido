DROP POLICY IF EXISTS "team invites deny direct access" ON public.team_invites;

GRANT SELECT, INSERT, UPDATE ON public.team_invites TO authenticated;

CREATE POLICY "team invites managers read"
ON public.team_invites
FOR SELECT TO authenticated
USING (public.can_manage_event(event_id));

CREATE POLICY "team invites managers create"
ON public.team_invites
FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_event(event_id)
  AND invited_by = auth.uid()
  AND (
    role = 'attendant'::public.app_role
    OR (role = 'organizer'::public.app_role AND public.is_admin())
  )
);

CREATE POLICY "team invites managers update"
ON public.team_invites
FOR UPDATE TO authenticated
USING (public.can_manage_event(event_id))
WITH CHECK (
  public.can_manage_event(event_id)
  AND (
    role = 'attendant'::public.app_role
    OR (role = 'organizer'::public.app_role AND public.is_admin())
  )
);

ALTER FUNCTION public.create_team_invite(uuid, text, text, public.app_role) SECURITY INVOKER;
ALTER FUNCTION public.list_team_invites(uuid) SECURITY INVOKER;
ALTER FUNCTION public.revoke_team_invite(uuid) SECURITY INVOKER;

DROP FUNCTION public.validate_team_invite(text, text);

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;