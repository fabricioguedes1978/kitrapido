CREATE TABLE public.team_password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  cpf text NOT NULL,
  code_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  used_at timestamptz,
  CONSTRAINT team_password_resets_cpf_check CHECK (cpf ~ '^[0-9]{11}$'),
  CONSTRAINT team_password_resets_status_check CHECK (status IN ('pending', 'used', 'revoked'))
);

GRANT ALL ON public.team_password_resets TO service_role;

ALTER TABLE public.team_password_resets ENABLE ROW LEVEL SECURITY;

CREATE INDEX team_password_resets_lookup_idx
ON public.team_password_resets (cpf, code_hash, status, expires_at);

CREATE INDEX team_password_resets_user_pending_idx
ON public.team_password_resets (user_id, status);

REVOKE ALL ON public.team_password_resets FROM PUBLIC, anon, authenticated;