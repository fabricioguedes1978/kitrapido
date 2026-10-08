CREATE OR REPLACE FUNCTION public.create_athlete_manually(_event_id uuid, _athlete jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE created_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_edit_athletes(_event_id) THEN RAISE EXCEPTION 'Você não tem permissão para cadastrar atletas neste evento.'; END IF;
 IF jsonb_typeof(_athlete) IS DISTINCT FROM 'object' OR nullif(btrim(_athlete->>'birth_date'),'') IS NULL OR nullif(btrim(_athlete->>'modality'),'') IS NULL OR nullif(btrim(_athlete->>'category'),'') IS NULL THEN RAISE EXCEPTION 'Preencha data de nascimento, modalidade e categoria.'; END IF;
 INSERT INTO public.athletes(event_id,name,birth_date,gender,city,equipe,cpf,email,phone,registration_number,bib_number,modality,category,shirt_size,kit_type,payment_status,custom_1,custom_2,custom_3,custom_4,custom_5)
 VALUES (_event_id,btrim(coalesce(_athlete->>'name','')),nullif(_athlete->>'birth_date','')::date,nullif(_athlete->>'gender',''),nullif(_athlete->>'city',''),nullif(_athlete->>'equipe',''),nullif(_athlete->>'cpf',''),nullif(_athlete->>'email',''),nullif(_athlete->>'phone',''),nullif(_athlete->>'registration_number',''),nullif(_athlete->>'bib_number',''),btrim(_athlete->>'modality'),btrim(_athlete->>'category'),nullif(_athlete->>'shirt_size',''),nullif(_athlete->>'kit_type',''),coalesce(nullif(_athlete->>'payment_status',''),'pago'),nullif(_athlete->>'custom_1',''),nullif(_athlete->>'custom_2',''),nullif(_athlete->>'custom_3',''),nullif(_athlete->>'custom_4',''),nullif(_athlete->>'custom_5','')) RETURNING id INTO created_id;
 RETURN created_id;
END; $$;
CREATE OR REPLACE FUNCTION public.validate_athlete_edit_completeness()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.birth_date IS NULL OR nullif(btrim(NEW.modality),'') IS NULL OR nullif(btrim(NEW.category),'') IS NULL THEN RAISE EXCEPTION 'Preencha data de nascimento, modalidade e categoria antes de salvar a edição.'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER athletes_validate_edit_completeness BEFORE UPDATE OF name,birth_date,gender,city,equipe,cpf,email,phone,registration_number,bib_number,modality,category,shirt_size,kit_type,payment_status,custom_1,custom_2,custom_3,custom_4,custom_5 ON public.athletes FOR EACH ROW EXECUTE FUNCTION public.validate_athlete_edit_completeness();