ALTER TABLE public.events ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.has_event_access(_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(auth.uid(), 'admin')
      OR (
        EXISTS (SELECT 1 FROM public.event_members m WHERE m.event_id = _event_id AND m.user_id = auth.uid())
        AND NOT COALESCE((SELECT e.archived FROM public.events e WHERE e.id = _event_id), false)
      )
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_event(_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(auth.uid(), 'admin')
      OR (
        EXISTS (SELECT 1 FROM public.event_members m
                WHERE m.event_id = _event_id AND m.user_id = auth.uid() AND m.role = 'organizer')
        AND NOT COALESCE((SELECT e.archived FROM public.events e WHERE e.id = _event_id), false)
      )
$function$;

DROP POLICY IF EXISTS "events public read" ON public.events;
CREATE POLICY "events public read" ON public.events FOR SELECT TO anon USING (archived = false);

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
    AND e.archived = false
    AND (regexp_replace(COALESCE(a.cpf,''), '\D', '', 'g') = regexp_replace(_doc, '\D', '', 'g')
         OR a.registration_number = _doc)
  LIMIT 1
$function$;