
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_delivery() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_event_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_event(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.public_kit_lookup(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_event_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_kit_lookup(text, text) TO anon, authenticated;
