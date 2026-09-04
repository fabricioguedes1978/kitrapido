ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_uidx
  ON public.profiles (cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';

CREATE OR REPLACE FUNCTION public.shares_managed_event(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_members me
    JOIN public.event_members other ON other.event_id = me.event_id
    WHERE me.user_id = auth.uid()
      AND me.role = 'organizer'
      AND other.user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "profiles team read" ON public.profiles;
CREATE POLICY "profiles team read" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.shares_managed_event(id));