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
  existing_user_id uuid;
  member_id uuid;
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

  SELECT p.id INTO existing_user_id
  FROM public.profiles p
  WHERE regexp_replace(COALESCE(p.cpf, ''), '\D', '', 'g') = normalized_cpf
  ORDER BY p.created_at
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.event_id = _event_id AND em.user_id = existing_user_id
    ) THEN
      RAISE EXCEPTION 'Esta pessoa já faz parte da equipe deste evento.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = existing_user_id AND ur.role = _role
    ) THEN
      RAISE EXCEPTION 'Esta pessoa já possui acesso com uma função diferente.';
    END IF;

    INSERT INTO public.event_members (event_id, user_id, role)
    VALUES (_event_id, existing_user_id, _role)
    ON CONFLICT (event_id, user_id) DO UPDATE SET role = EXCLUDED.role
    RETURNING id INTO member_id;

    UPDATE public.team_invites
    SET status = 'accepted', accepted_user_id = existing_user_id
    WHERE event_id = _event_id AND cpf = normalized_cpf AND status = 'pending';

    RETURN QUERY SELECT member_id, NULL::text, NULL::timestamptz;
    RETURN;
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