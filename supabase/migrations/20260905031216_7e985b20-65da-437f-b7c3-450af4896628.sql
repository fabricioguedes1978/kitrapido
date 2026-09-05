ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS city text;

DROP FUNCTION IF EXISTS public.public_kit_lookup(text, text);

CREATE OR REPLACE FUNCTION public.public_kit_lookup(_slug text, _doc text)
 RETURNS TABLE(athlete_id uuid, name text, bib_number text, modality text, category text, shirt_size text, kit_type text, kit_status kit_status, city text, event_name text, delivered_at timestamp with time zone, qr_payload text, custom_labels text[], custom_values text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.name, a.bib_number, a.modality, a.category, a.shirt_size, a.kit_type,
         a.kit_status, a.city, e.name,
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
  LIMIT 1
$function$;

GRANT ALL ON public.athletes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.athletes TO authenticated;