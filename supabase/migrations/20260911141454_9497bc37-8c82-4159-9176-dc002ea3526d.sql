ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS online_checkin_at timestamp with time zone;

DROP FUNCTION IF EXISTS public.public_kit_lookup(text, text);
CREATE FUNCTION public.public_kit_lookup(_slug text, _doc text)
 RETURNS TABLE(athlete_id uuid, name text, bib_number text, modality text, category text, shirt_size text, kit_type text, kit_status kit_status, city text, birth_date date, gender text, payment_status text, event_name text, event_date date, event_time time, event_city text, event_state text, event_address text, start_location text, pickup_address text, pickup_city text, pickup_info text, pickup_maps_url text, delivered_at timestamp with time zone, qr_payload text, custom_labels text[], custom_values text[])
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  matched_athlete_id uuid;
BEGIN
  SELECT a.id INTO matched_athlete_id
  FROM public.athletes a
  JOIN public.events e ON e.id = a.event_id
  WHERE e.slug = _slug
    AND e.archived = false
    AND (regexp_replace(COALESCE(a.cpf,''), '\D', '', 'g') = regexp_replace(_doc, '\D', '', 'g')
         OR a.registration_number = _doc)
  LIMIT 1;

  IF matched_athlete_id IS NOT NULL THEN
    UPDATE public.athletes
    SET online_checkin_at = COALESCE(online_checkin_at, now())
    WHERE id = matched_athlete_id;
  END IF;

  RETURN QUERY
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
  WHERE a.id = matched_athlete_id;
END
$function$;

DROP FUNCTION IF EXISTS public.public_kit_lookup_all(text);
CREATE FUNCTION public.public_kit_lookup_all(_doc text)
 RETURNS TABLE(athlete_id uuid, name text, bib_number text, modality text, category text, shirt_size text, kit_type text, kit_status kit_status, city text, birth_date date, gender text, payment_status text, event_id uuid, event_name text, event_slug text, event_date date, event_time time, event_city text, event_state text, event_address text, start_location text, pickup_address text, pickup_city text, pickup_info text, pickup_maps_url text, delivered_at timestamp with time zone, qr_payload text, custom_labels text[], custom_values text[])
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.athletes a
  SET online_checkin_at = COALESCE(a.online_checkin_at, now())
  FROM public.events e
  WHERE e.id = a.event_id
    AND e.archived = false
    AND length(regexp_replace(COALESCE(_doc,''), '\D', '', 'g')) >= 5
    AND (regexp_replace(COALESCE(a.cpf,''), '\D', '', 'g') = regexp_replace(_doc, '\D', '', 'g')
         OR a.registration_number = _doc);

  RETURN QUERY
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
END
$function$;

REVOKE ALL ON FUNCTION public.public_kit_lookup(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_kit_lookup_all(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_kit_lookup(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_kit_lookup_all(text) TO anon, authenticated;