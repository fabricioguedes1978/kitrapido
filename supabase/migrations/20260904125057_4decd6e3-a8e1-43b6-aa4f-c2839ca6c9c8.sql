ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS custom_field_labels text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS custom_1 text,
  ADD COLUMN IF NOT EXISTS custom_2 text,
  ADD COLUMN IF NOT EXISTS custom_3 text,
  ADD COLUMN IF NOT EXISTS custom_4 text,
  ADD COLUMN IF NOT EXISTS custom_5 text;

DROP FUNCTION IF EXISTS public.public_kit_lookup(text, text);

CREATE OR REPLACE FUNCTION public.public_kit_lookup(_slug text, _doc text)
 RETURNS TABLE(athlete_id uuid, name text, bib_number text, modality text, category text, shirt_size text, kit_type text, kit_status kit_status, event_name text, delivered_at timestamp with time zone, qr_payload text, custom_labels text[], custom_values text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.name, a.bib_number, a.modality, a.category, a.shirt_size, a.kit_type,
         a.kit_status, e.name,
         (SELECT d.delivered_at FROM public.deliveries d WHERE d.athlete_id = a.id AND d.status='active' LIMIT 1),
         'CRONOCHIP:' || e.id::text || ':' || a.id::text,
         e.custom_field_labels,
         ARRAY[COALESCE(a.custom_1,''), COALESCE(a.custom_2,''), COALESCE(a.custom_3,''), COALESCE(a.custom_4,''), COALESCE(a.custom_5,'')]
  FROM public.athletes a
  JOIN public.events e ON e.id = a.event_id
  WHERE e.slug = _slug
    AND (regexp_replace(COALESCE(a.cpf,''), '\D', '', 'g') = regexp_replace(_doc, '\D', '', 'g')
         OR a.registration_number = _doc)
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.public_kit_lookup(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_kit_lookup(text, text) TO anon, authenticated;