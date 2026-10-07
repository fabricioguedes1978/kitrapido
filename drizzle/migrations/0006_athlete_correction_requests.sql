CREATE TABLE public.athlete_correction_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.events(id),
 athlete_id uuid NOT NULL REFERENCES public.athletes(id),
 observation text NOT NULL CHECK (length(btrim(observation)) BETWEEN 3 AND 2000),
 requested_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
 requested_by_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
 resolved_at timestamptz,
 resolved_by uuid REFERENCES public.profiles(id),
 resolved_by_name text,
 resolution_note text,
 CHECK ((status='pending' AND resolved_at IS NULL AND resolved_by IS NULL) OR (status='resolved' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL))
);
GRANT SELECT, INSERT ON public.athlete_correction_requests TO authenticated;
GRANT ALL ON public.athlete_correction_requests TO service_role;
ALTER TABLE public.athlete_correction_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY correction_read ON public.athlete_correction_requests FOR SELECT TO authenticated USING (public.can_manage_event(event_id));
CREATE POLICY correction_insert ON public.athlete_correction_requests FOR INSERT TO authenticated WITH CHECK (public.has_event_access(event_id) AND requested_by=auth.uid() AND status='pending' AND resolved_at IS NULL AND resolved_by IS NULL AND resolved_by_name IS NULL AND resolution_note IS NULL AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id=athlete_id AND a.event_id=athlete_correction_requests.event_id) AND requested_by_name=(SELECT p.name FROM public.profiles p WHERE p.id=auth.uid()));
CREATE INDEX correction_event_status ON public.athlete_correction_requests(event_id,status,created_at DESC);
CREATE FUNCTION public.resolve_athlete_correction(_request_id uuid, _changes jsonb, _note text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.athlete_correction_requests; a public.athletes; after_data public.athletes; actor text; k text;
BEGIN
 SELECT * INTO r FROM public.athlete_correction_requests WHERE id=_request_id FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_event(r.event_id) THEN RAISE EXCEPTION 'Sem permissão para resolver esta pendência'; END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'Esta pendência já foi resolvida'; END IF;
 IF jsonb_typeof(_changes) IS DISTINCT FROM 'object' OR length(coalesce(_note,''))>2000 THEN RAISE EXCEPTION 'Correção inválida'; END IF;
 FOR k IN SELECT jsonb_object_keys(_changes) LOOP
  IF k NOT IN ('name','birth_date','gender','equipe','city','modality','category','phone','email','custom_1','custom_2','custom_3','custom_4','custom_5') THEN RAISE EXCEPTION 'Campo não permitido'; END IF;
  IF jsonb_typeof(_changes->k) NOT IN ('string','null') OR length(coalesce(_changes->>k,''))>500 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
 END LOOP;
 SELECT * INTO a FROM public.athletes WHERE id=r.athlete_id AND event_id=r.event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Atleta não encontrado'; END IF;
 IF _changes ? 'name' AND length(btrim(coalesce(_changes->>'name','')))=0 THEN RAISE EXCEPTION 'Informe o nome do atleta'; END IF;
 SELECT name INTO actor FROM public.profiles WHERE id=auth.uid();
 IF _changes<>'{}'::jsonb THEN
 UPDATE public.athletes SET
 name=CASE WHEN _changes ? 'name' THEN btrim(_changes->>'name') ELSE name END,
 birth_date=CASE WHEN _changes ? 'birth_date' THEN nullif(_changes->>'birth_date','')::date ELSE birth_date END,
 gender=CASE WHEN _changes ? 'gender' THEN nullif(_changes->>'gender','') ELSE gender END,
 equipe=CASE WHEN _changes ? 'equipe' THEN nullif(_changes->>'equipe','') ELSE equipe END,
 city=CASE WHEN _changes ? 'city' THEN nullif(_changes->>'city','') ELSE city END,
 modality=CASE WHEN _changes ? 'modality' THEN nullif(_changes->>'modality','') ELSE modality END,
 category=CASE WHEN _changes ? 'category' THEN nullif(_changes->>'category','') ELSE category END,
 phone=CASE WHEN _changes ? 'phone' THEN nullif(_changes->>'phone','') ELSE phone END,
 email=CASE WHEN _changes ? 'email' THEN nullif(_changes->>'email','') ELSE email END,
 custom_1=CASE WHEN _changes ? 'custom_1' THEN nullif(_changes->>'custom_1','') ELSE custom_1 END,
 custom_2=CASE WHEN _changes ? 'custom_2' THEN nullif(_changes->>'custom_2','') ELSE custom_2 END,
 custom_3=CASE WHEN _changes ? 'custom_3' THEN nullif(_changes->>'custom_3','') ELSE custom_3 END,
 custom_4=CASE WHEN _changes ? 'custom_4' THEN nullif(_changes->>'custom_4','') ELSE custom_4 END,
 custom_5=CASE WHEN _changes ? 'custom_5' THEN nullif(_changes->>'custom_5','') ELSE custom_5 END
 WHERE id=a.id RETURNING * INTO after_data;
 ELSE after_data:=a; END IF;
 UPDATE public.athlete_correction_requests SET status='resolved',resolved_at=now(),resolved_by=auth.uid(),resolved_by_name=actor,resolution_note=nullif(btrim(_note),'') WHERE id=r.id;
 INSERT INTO public.audit_logs(user_id,user_name,event_id,action,entity,entity_id,old_data,new_data) VALUES(auth.uid(),actor,r.event_id,'Pendência resolvida','athlete_correction_requests',r.id,jsonb_build_object('athlete',to_jsonb(a),'status','pending'),jsonb_build_object('athlete',to_jsonb(after_data),'status','resolved','note',_note));
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_athlete_correction(uuid,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_athlete_correction(uuid,jsonb,text) TO authenticated;