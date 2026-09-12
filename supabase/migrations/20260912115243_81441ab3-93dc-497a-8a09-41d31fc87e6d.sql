CREATE TABLE public.chat_settings (
  id text PRIMARY KEY DEFAULT 'global',
  mode text NOT NULL DEFAULT 'fixed' CHECK (mode IN ('fixed', 'ai')),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.chat_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.chat_settings TO authenticated;
GRANT ALL ON public.chat_settings TO service_role;

ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat settings public read"
ON public.chat_settings
FOR SELECT
TO anon, authenticated
USING (id = 'global');

CREATE POLICY "chat settings admin insert"
ON public.chat_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND id = 'global');

CREATE POLICY "chat settings admin update"
ON public.chat_settings
FOR UPDATE
TO authenticated
USING (public.is_admin() AND id = 'global')
WITH CHECK (public.is_admin() AND id = 'global');