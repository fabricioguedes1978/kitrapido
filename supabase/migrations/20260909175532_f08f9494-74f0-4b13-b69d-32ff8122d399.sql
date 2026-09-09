-- 1) Restrict EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.can_edit_athletes(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_import_athletes(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_event(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_event_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.shares_managed_event(uuid) FROM anon;

-- trigger-only functions: nobody should call these directly
REVOKE EXECUTE ON FUNCTION public.guard_athletes_lock() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_event_archived() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_organizer_import() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_delivery() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_event() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_default_athletes_lock() FROM anon, authenticated;

-- public lookups stay callable
GRANT EXECUTE ON FUNCTION public.public_kit_lookup(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_kit_lookup_all(text) TO anon, authenticated;

-- 2) profiles: hide cpf/phone from the Data API
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, name, email, created_at) ON public.profiles TO authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name, email, phone) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 3) third_party_authorizations: only organizers/admins can manage
DROP POLICY IF EXISTS "tpa manage" ON public.third_party_authorizations;
CREATE POLICY "tpa manage" ON public.third_party_authorizations
  FOR ALL TO authenticated
  USING (public.can_manage_event(event_id))
  WITH CHECK (public.can_manage_event(event_id));

-- 4) user_roles: no client-side writes at all
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;
GRANT ALL ON public.user_roles TO service_role;