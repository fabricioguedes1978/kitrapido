DROP POLICY IF EXISTS "athletes manage" ON public.athletes;

CREATE POLICY "athletes insert with import permission"
ON public.athletes
FOR INSERT
TO authenticated
WITH CHECK (public.can_import_athletes(event_id));

CREATE POLICY "athletes delete with import permission"
ON public.athletes
FOR DELETE
TO authenticated
USING (public.can_import_athletes(event_id));

CREATE POLICY "athletes update by manager"
ON public.athletes
FOR UPDATE
TO authenticated
USING (public.can_edit_athletes(event_id))
WITH CHECK (public.can_edit_athletes(event_id));

CREATE OR REPLACE FUNCTION public.create_athlete_manually(_event_id uuid, _athlete jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_edit_athletes(_event_id) THEN
    RAISE EXCEPTION 'Você não tem permissão para cadastrar atletas neste evento.';
  END IF;

  INSERT INTO public.athletes (
    event_id, name, birth_date, gender, city, equipe, cpf, email, phone,
    registration_number, bib_number, modality, category, shirt_size, kit_type,
    payment_status, custom_1, custom_2, custom_3, custom_4, custom_5
  ) VALUES (
    _event_id,
    btrim(COALESCE(_athlete->>'name', '')),
    NULLIF(_athlete->>'birth_date', '')::date,
    NULLIF(_athlete->>'gender', ''),
    NULLIF(_athlete->>'city', ''),
    NULLIF(_athlete->>'equipe', ''),
    NULLIF(_athlete->>'cpf', ''),
    NULLIF(_athlete->>'email', ''),
    NULLIF(_athlete->>'phone', ''),
    NULLIF(_athlete->>'registration_number', ''),
    NULLIF(_athlete->>'bib_number', ''),
    NULLIF(_athlete->>'modality', ''),
    NULLIF(_athlete->>'category', ''),
    NULLIF(_athlete->>'shirt_size', ''),
    NULLIF(_athlete->>'kit_type', ''),
    COALESCE(NULLIF(_athlete->>'payment_status', ''), 'pago'),
    NULLIF(_athlete->>'custom_1', ''),
    NULLIF(_athlete->>'custom_2', ''),
    NULLIF(_athlete->>'custom_3', ''),
    NULLIF(_athlete->>'custom_4', ''),
    NULLIF(_athlete->>'custom_5', '')
  )
  RETURNING id INTO created_id;

  RETURN created_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_athlete_manually(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_athlete_manually(uuid, jsonb) TO authenticated;