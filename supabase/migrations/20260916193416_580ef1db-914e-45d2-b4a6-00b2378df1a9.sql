CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.online_checkin_status_all(_doc text)
RETURNS TABLE(athlete_id uuid, online_checkin_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.online_checkin_at
  FROM public.athletes a
  JOIN public.events e ON e.id = a.event_id
  WHERE e.archived = false
    AND length(regexp_replace(COALESCE(_doc,''), '\D', '', 'g')) = 11
    AND regexp_replace(COALESCE(a.cpf,''), '\D', '', 'g') = regexp_replace(_doc, '\D', '', 'g');
$function$;

CREATE OR REPLACE FUNCTION private.confirm_online_checkin(_athlete_id uuid, _doc text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  confirmed_at timestamp with time zone;
BEGIN
  IF length(regexp_replace(COALESCE(_doc,''), '\D', '', 'g')) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido';
  END IF;

  UPDATE public.athletes a
  SET online_checkin_at = COALESCE(a.online_checkin_at, now())
  FROM public.events e
  WHERE a.id = _athlete_id
    AND e.id = a.event_id
    AND e.archived = false
    AND regexp_replace(COALESCE(a.cpf,''), '\D', '', 'g') = regexp_replace(_doc, '\D', '', 'g')
  RETURNING a.online_checkin_at INTO confirmed_at;

  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Inscrição não encontrada para este CPF';
  END IF;

  RETURN confirmed_at;
END;
$function$;

REVOKE ALL ON FUNCTION private.online_checkin_status_all(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.confirm_online_checkin(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres;
GRANT EXECUTE ON FUNCTION private.online_checkin_status_all(text) TO postgres;
GRANT EXECUTE ON FUNCTION private.confirm_online_checkin(uuid, text) TO postgres;

CREATE OR REPLACE FUNCTION public.public_online_checkin_status_all(_doc text)
RETURNS TABLE(athlete_id uuid, online_checkin_at timestamp with time zone)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT * FROM private.online_checkin_status_all(_doc);
$function$;

CREATE OR REPLACE FUNCTION public.confirm_public_online_checkin(_athlete_id uuid, _doc text)
RETURNS timestamp with time zone
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.confirm_online_checkin(_athlete_id, _doc);
$function$;

GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.online_checkin_status_all(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.confirm_online_checkin(uuid, text) TO anon, authenticated, service_role;