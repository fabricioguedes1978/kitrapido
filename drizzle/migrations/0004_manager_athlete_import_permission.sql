ALTER TABLE public.event_members
ADD COLUMN can_import_athletes boolean NOT NULL DEFAULT false;

ALTER TABLE public.team_invites
ADD COLUMN can_import_athletes boolean NOT NULL DEFAULT false;

UPDATE public.event_members em
SET can_import_athletes = true
FROM public.events e
WHERE em.event_id = e.id
  AND em.role = 'organizer'::public.app_role
  AND e.allow_organizer_import = true;

COMMENT ON COLUMN public.events.allow_organizer_import IS 'DEPRECATED: replaced by event_members.can_import_athletes for individual manager permissions';

CREATE OR REPLACE FUNCTION public.can_import_athletes(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      WHERE em.event_id = _event_id
        AND em.user_id = auth.uid()
        AND em.role = 'organizer'::public.app_role
        AND em.can_import_athletes
    )
$$;

REVOKE ALL ON FUNCTION public.can_import_athletes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_import_athletes(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_organizer_import_permission(_member_id uuid, _allowed boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role public.app_role;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente o administrador pode alterar a permissão de importação.';
  END IF;

  SELECT role INTO target_role
  FROM public.event_members
  WHERE id = _member_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Vínculo não encontrado.';
  END IF;
  IF target_role <> 'organizer'::public.app_role THEN
    RAISE EXCEPTION 'Esta permissão só pode ser alterada para gerente.';
  END IF;

  UPDATE public.event_members
  SET can_import_athletes = COALESCE(_allowed, false)
  WHERE id = _member_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_organizer_import_permission(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_organizer_import_permission(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_team_invite_with_access_permissions(
  _event_id uuid,
  _cpf text,
  _name text,
  _role public.app_role,
  _can_cancel_deliveries boolean DEFAULT false,
  _can_import_athletes boolean DEFAULT false
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
  allowed_to_cancel boolean := CASE WHEN _role = 'attendant'::public.app_role THEN COALESCE(_can_cancel_deliveries, false) ELSE false END;
  allowed_to_import boolean := CASE WHEN _role = 'organizer'::public.app_role AND public.is_admin() THEN COALESCE(_can_import_athletes, false) ELSE false END;
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
      IF EXISTS (SELECT 1 FROM public.event_members em WHERE em.user_id = existing_user_id) THEN
        RAISE EXCEPTION 'Esta pessoa possui uma função diferente e ainda está vinculada a outro evento.';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = existing_user_id AND ur.role = 'admin'
      ) THEN
        RAISE EXCEPTION 'A função de administrador não pode ser alterada por este cadastro.';
      END IF;
      DELETE FROM public.user_roles
      WHERE user_id = existing_user_id AND role IN ('organizer', 'attendant');
      INSERT INTO public.user_roles (user_id, role)
      VALUES (existing_user_id, _role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    INSERT INTO public.event_members (
      event_id, user_id, role, can_cancel_deliveries, can_import_athletes
    ) VALUES (
      _event_id, existing_user_id, _role, allowed_to_cancel, allowed_to_import
    )
    ON CONFLICT (event_id, user_id) DO UPDATE
      SET role = EXCLUDED.role,
          can_cancel_deliveries = EXCLUDED.can_cancel_deliveries,
          can_import_athletes = EXCLUDED.can_import_athletes
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
    event_id, cpf, name, role, code_hash, status, invited_by, expires_at,
    can_cancel_deliveries, can_import_athletes
  ) VALUES (
    _event_id,
    normalized_cpf,
    clean_name,
    _role,
    encode(extensions.digest(convert_to(replace(generated_code, '-', ''), 'UTF8'), 'sha256'), 'hex'),
    'pending',
    auth.uid(),
    now() + interval '7 days',
    allowed_to_cancel,
    allowed_to_import
  )
  RETURNING id, generated_code, expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_invite_with_access_permissions(uuid, text, text, public.app_role, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_invite_with_access_permissions(uuid, text, text, public.app_role, boolean, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_team_invites_with_access_permissions(_event_id uuid)
RETURNS TABLE(
  id uuid,
  cpf text,
  name text,
  role public.app_role,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  can_cancel_deliveries boolean,
  can_import_athletes boolean
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
  SELECT ti.id, ti.cpf, ti.name, ti.role, ti.status, ti.created_at, ti.expires_at,
         ti.can_cancel_deliveries, ti.can_import_athletes
  FROM public.team_invites ti
  WHERE ti.event_id = _event_id
  ORDER BY ti.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_team_invites_with_access_permissions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_team_invites_with_access_permissions(uuid) TO authenticated;

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

    INSERT INTO public.event_members (
      event_id, user_id, role, can_cancel_deliveries, can_import_athletes
    ) VALUES (
      claimed_invite.event_id,
      NEW.id,
      claimed_invite.role,
      claimed_invite.can_cancel_deliveries,
      claimed_invite.can_import_athletes
    )
    ON CONFLICT (event_id, user_id) DO UPDATE
      SET role = EXCLUDED.role,
          can_cancel_deliveries = EXCLUDED.can_cancel_deliveries,
          can_import_athletes = EXCLUDED.can_import_athletes;

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