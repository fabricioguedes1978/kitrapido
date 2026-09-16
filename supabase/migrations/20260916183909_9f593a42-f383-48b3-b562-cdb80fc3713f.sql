CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  cpf text NOT NULL,
  name text NOT NULL,
  role public.app_role NOT NULL,
  code_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  accepted_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT team_invites_role_check CHECK (role IN ('organizer', 'attendant')),
  CONSTRAINT team_invites_status_check CHECK (status IN ('pending', 'accepted', 'revoked')),
  CONSTRAINT team_invites_cpf_check CHECK (cpf ~ '^[0-9]{11}$')
);
GRANT ALL ON public.team_invites TO service_role;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team invites deny direct access"
ON public.team_invites FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE UNIQUE INDEX team_invites_one_pending_per_event_cpf
ON public.team_invites (event_id, cpf)
WHERE status = 'pending';
CREATE INDEX team_invites_pending_lookup_idx
ON public.team_invites (cpf, status, expires_at);

CREATE OR REPLACE FUNCTION public.touch_team_invite_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_team_invite_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER team_invites_touch_updated_at
BEFORE UPDATE ON public.team_invites
FOR EACH ROW EXECUTE FUNCTION public.touch_team_invite_updated_at();

CREATE OR REPLACE FUNCTION public.create_team_invite(
  _event_id uuid,
  _cpf text,
  _name text,
  _role public.app_role
)
RETURNS TABLE(invite_id uuid, activation_code text, invite_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  normalized_cpf text := regexp_replace(COALESCE(_cpf, ''), '\D', '', 'g');
  clean_name text := btrim(COALESCE(_name, ''));
  generated_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Você precisa entrar no sistema.';
  END IF;
  IF NOT public.can_manage_event(_event_id) THEN
    RAISE EXCEPTION 'Você não tem permissão para gerenciar a equipe deste evento.';
  END IF;
  IF _role NOT IN ('organizer', 'attendant') THEN
    RAISE EXCEPTION 'Função inválida.';
  END IF;
  IF _role = 'organizer' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente o administrador pode convidar um gerente.';
  END IF;
  IF length(normalized_cpf) <> 11 OR NOT public.is_valid_cpf(normalized_cpf) THEN
    RAISE EXCEPTION 'Informe um CPF válido com 11 dígitos.';
  END IF;
  IF length(clean_name) < 2 OR length(clean_name) > 120 THEN
    RAISE EXCEPTION 'Informe um nome entre 2 e 120 caracteres.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.event_members em ON em.user_id = p.id
    WHERE em.event_id = _event_id AND regexp_replace(COALESCE(p.cpf, ''), '\D', '', 'g') = normalized_cpf
  ) THEN
    RAISE EXCEPTION 'Esta pessoa já faz parte da equipe deste evento.';
  END IF;

  UPDATE public.team_invites
  SET status = 'revoked'
  WHERE event_id = _event_id AND cpf = normalized_cpf AND status = 'pending';

  generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  RETURN QUERY
  INSERT INTO public.team_invites (
    event_id, cpf, name, role, code_hash, status, invited_by, expires_at
  ) VALUES (
    _event_id,
    normalized_cpf,
    clean_name,
    _role,
    encode(extensions.digest(convert_to(replace(generated_code, '-', ''), 'UTF8'), 'sha256'), 'hex'),
    'pending',
    auth.uid(),
    now() + interval '7 days'
  )
  RETURNING id, generated_code, expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_invite(uuid, text, text, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_invite(uuid, text, text, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_team_invites(_event_id uuid)
RETURNS TABLE(
  id uuid,
  cpf text,
  name text,
  role public.app_role,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_event(_event_id) THEN
    RAISE EXCEPTION 'Você não tem permissão para consultar os convites deste evento.';
  END IF;
  RETURN QUERY
  SELECT ti.id, ti.cpf, ti.name, ti.role, ti.status, ti.created_at, ti.expires_at
  FROM public.team_invites ti
  WHERE ti.event_id = _event_id
  ORDER BY ti.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_team_invites(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_team_invites(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_team_invite(_invite_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event_id uuid;
BEGIN
  SELECT event_id INTO target_event_id
  FROM public.team_invites
  WHERE id = _invite_id AND status = 'pending';

  IF target_event_id IS NULL OR NOT public.can_manage_event(target_event_id) THEN
    RAISE EXCEPTION 'Convite não encontrado ou sem permissão para cancelar.';
  END IF;

  UPDATE public.team_invites SET status = 'revoked' WHERE id = _invite_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_team_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_team_invite(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_team_invite(_cpf text, _code text)
RETURNS TABLE(invite_name text, invite_role public.app_role, event_name text, invite_expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT ti.name, ti.role, e.name, ti.expires_at
  FROM public.team_invites ti
  JOIN public.events e ON e.id = ti.event_id
  WHERE ti.cpf = regexp_replace(COALESCE(_cpf, ''), '\D', '', 'g')
    AND ti.code_hash = encode(extensions.digest(convert_to(upper(regexp_replace(COALESCE(_code, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8'), 'sha256'), 'hex')
    AND ti.status = 'pending'
    AND ti.expires_at > now()
    AND e.archived = false
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.validate_team_invite(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_team_invite(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  admin_count integer;
  normalized_cpf text;
  supplied_code text;
  claimed_invite public.team_invites%ROWTYPE;
BEGIN
  normalized_cpf := regexp_replace(split_part(COALESCE(NEW.email, ''), '@', 1), '\D', '', 'g');
  supplied_code := upper(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'activation_code', ''), '[^A-Za-z0-9]', '', 'g'));

  IF NEW.email LIKE '%@equipe.cronochip.app' THEN
    IF length(normalized_cpf) <> 11 OR supplied_code = '' THEN
      RAISE EXCEPTION 'Cadastro não autorizado. Use um convite válido.';
    END IF;

    UPDATE public.team_invites ti
    SET status = 'accepted', accepted_user_id = NEW.id
    WHERE ti.id = (
      SELECT candidate.id
      FROM public.team_invites candidate
      JOIN public.events e ON e.id = candidate.event_id
      WHERE candidate.cpf = normalized_cpf
        AND candidate.code_hash = encode(extensions.digest(convert_to(supplied_code, 'UTF8'), 'sha256'), 'hex')
        AND candidate.status = 'pending'
        AND candidate.expires_at > now()
        AND e.archived = false
      ORDER BY candidate.created_at DESC
      LIMIT 1
      FOR UPDATE OF candidate
    )
    AND ti.status = 'pending'
    RETURNING ti.* INTO claimed_invite;

    IF claimed_invite.id IS NULL THEN
      RAISE EXCEPTION 'Cadastro não autorizado. O convite é inválido, expirou ou já foi usado.';
    END IF;

    INSERT INTO public.profiles (id, name, email, cpf)
    VALUES (NEW.id, claimed_invite.name, COALESCE(NEW.email, ''), normalized_cpf)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, email = EXCLUDED.email, cpf = EXCLUDED.cpf;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, claimed_invite.role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.event_members (event_id, user_id, role)
    VALUES (claimed_invite.event_id, NEW.id, claimed_invite.role)
    ON CONFLICT (event_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Cadastro público não autorizado.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;