CREATE OR REPLACE FUNCTION public.public_kit_lookup(_slug text, _doc text)
RETURNS TABLE(athlete_id uuid, name text, bib_number text, modality text, category text, shirt_size text, kit_type text, kit_status kit_status, city text, birth_date date, gender text, payment_status text, event_name text, event_date date, event_time time without time zone, event_city text, event_state text, event_address text, start_location text, pickup_address text, pickup_city text, pickup_info text, pickup_maps_url text, delivered_at timestamp with time zone, qr_payload text, custom_labels text[], custom_values text[])
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.name, a.bib_number, a.modality, a.category, a.shirt_size, a.kit_type,
         a.kit_status, a.city, a.birth_date, a.gender, a.payment_status,
         e.name, e.event_date, e.event_time, e.city, e.state, e.address,
         e.start_location, e.pickup_address, e.pickup_city, e.pickup_info, e.pickup_maps_url,
         (SELECT d.delivered_at FROM public.deliveries d WHERE d.athlete_id = a.id AND d.status='active' LIMIT 1),
         'CRONOCHIP:' || e.id::text || ':' || a.id::text,
         e.custom_field_labels,
         ARRAY[COALESCE(a.custom_1,''), COALESCE(a.custom_2,''), COALESCE(a.custom_3,''), COALESCE(a.custom_4,''), COALESCE(a.custom_5,'')]
  FROM public.athletes a
  JOIN public.events e ON e.id = a.event_id
  WHERE e.slug = _slug
    AND e.archived = false
    AND (regexp_replace(COALESCE(a.cpf,''), '\D', '', 'g') = regexp_replace(_doc, '\D', '', 'g')
         OR a.registration_number = _doc)
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.public_kit_lookup_all(_doc text)
RETURNS TABLE(athlete_id uuid, name text, bib_number text, modality text, category text, shirt_size text, kit_type text, kit_status kit_status, city text, birth_date date, gender text, payment_status text, event_id uuid, event_name text, event_slug text, event_date date, event_time time without time zone, event_city text, event_state text, event_address text, start_location text, pickup_address text, pickup_city text, pickup_info text, pickup_maps_url text, delivered_at timestamp with time zone, qr_payload text, custom_labels text[], custom_values text[])
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.name, a.bib_number, a.modality, a.category, a.shirt_size, a.kit_type,
         a.kit_status, a.city, a.birth_date, a.gender, a.payment_status,
         e.id, e.name, e.slug, e.event_date, e.event_time, e.city, e.state, e.address,
         e.start_location, e.pickup_address, e.pickup_city, e.pickup_info, e.pickup_maps_url,
         (SELECT d.delivered_at FROM public.deliveries d WHERE d.athlete_id = a.id AND d.status='active' LIMIT 1),
         'CRONOCHIP:' || e.id::text || ':' || a.id::text,
         e.custom_field_labels,
         ARRAY[COALESCE(a.custom_1,''), COALESCE(a.custom_2,''), COALESCE(a.custom_3,''), COALESCE(a.custom_4,''), COALESCE(a.custom_5,'')]
  FROM public.athletes a
  JOIN public.events e ON e.id = a.event_id
  WHERE e.archived = false
    AND length(regexp_replace(COALESCE(_doc,''), '\D', '', 'g')) >= 5
    AND (regexp_replace(COALESCE(a.cpf,''), '\D', '', 'g') = regexp_replace(_doc, '\D', '', 'g')
         OR a.registration_number = _doc)
  ORDER BY e.event_date DESC NULLS LAST;
$function$;

CREATE OR REPLACE FUNCTION public.public_online_checkin_status_all(_doc text)
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

CREATE OR REPLACE FUNCTION public.confirm_public_online_checkin(_athlete_id uuid, _doc text)
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

REVOKE ALL ON FUNCTION public.public_online_checkin_status_all(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_public_online_checkin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_online_checkin_status_all(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_public_online_checkin(uuid, text) TO anon, authenticated, service_role;