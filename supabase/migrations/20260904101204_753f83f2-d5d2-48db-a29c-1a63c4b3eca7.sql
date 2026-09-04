
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','organizer','attendant');
CREATE TYPE public.event_status AS ENUM ('planning','registrations_open','registrations_closed','kit_delivery','completed','closed');
CREATE TYPE public.kit_status AS ENUM ('pending','delivered','third_party','blocked');
CREATE TYPE public.delivery_type AS ENUM ('athlete','third_party');
CREATE TYPE public.delivery_status AS ENUM ('active','cancelled');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- EVENTS
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  event_date date,
  event_time time,
  city text,
  state text,
  address text,
  logo_url text,
  description text,
  modalities text[] NOT NULL DEFAULT '{}',
  status public.event_status NOT NULL DEFAULT 'planning',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.event_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_members TO authenticated;
GRANT ALL ON public.event_members TO service_role;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_event_access(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.event_members m WHERE m.event_id = _event_id AND m.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.can_manage_event(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.event_members m
                 WHERE m.event_id = _event_id AND m.user_id = auth.uid() AND m.role = 'organizer')
$$;

-- KITS
CREATE TABLE public.kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kits TO authenticated;
GRANT ALL ON public.kits TO service_role;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_items TO authenticated;
GRANT ALL ON public.kit_items TO service_role;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;

-- PICKUP LOCATIONS
CREATE TABLE public.pickup_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  date date,
  start_time time,
  end_time time,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pickup_locations TO authenticated;
GRANT ALL ON public.pickup_locations TO service_role;
ALTER TABLE public.pickup_locations ENABLE ROW LEVEL SECURITY;

-- INVENTORY
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'camiseta',
  size text NOT NULL,
  quantity_initial integer NOT NULL DEFAULT 0,
  quantity_current integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, item_type, size)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- ATHLETES
CREATE TABLE public.athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  cpf text,
  birth_date date,
  gender text,
  email text,
  phone text,
  registration_number text,
  bib_number text,
  modality text,
  category text,
  distance text,
  shirt_size text,
  kit_type text,
  registration_status text NOT NULL DEFAULT 'confirmada',
  payment_status text NOT NULL DEFAULT 'pago',
  kit_status public.kit_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.athletes TO authenticated;
GRANT ALL ON public.athletes TO service_role;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX athletes_event_cpf_uidx ON public.athletes (event_id, cpf) WHERE cpf IS NOT NULL AND cpf <> '';
CREATE UNIQUE INDEX athletes_event_reg_uidx ON public.athletes (event_id, registration_number) WHERE registration_number IS NOT NULL AND registration_number <> '';
CREATE INDEX athletes_event_idx ON public.athletes (event_id);
CREATE INDEX athletes_bib_idx ON public.athletes (event_id, bib_number);
CREATE INDEX athletes_name_idx ON public.athletes USING gin (to_tsvector('simple', name));
CREATE INDEX athletes_name_trgm_idx ON public.athletes (lower(name) text_pattern_ops);

-- THIRD PARTY AUTHORIZATIONS
CREATE TABLE public.third_party_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  cpf text NOT NULL,
  phone text,
  qr_code text NOT NULL DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.third_party_authorizations TO authenticated;
GRANT ALL ON public.third_party_authorizations TO service_role;
ALTER TABLE public.third_party_authorizations ENABLE ROW LEVEL SECURITY;

-- DELIVERIES
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  kit_id uuid REFERENCES public.kits(id) ON DELETE SET NULL,
  kit_name text,
  shirt_size text,
  location_id uuid REFERENCES public.pickup_locations(id) ON DELETE SET NULL,
  delivered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  delivered_by_name text,
  delivery_type public.delivery_type NOT NULL DEFAULT 'athlete',
  third_party_name text,
  third_party_cpf text,
  identification_method text NOT NULL DEFAULT 'busca',
  status public.delivery_status NOT NULL DEFAULT 'active',
  cancel_reason text,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  delivered_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX deliveries_active_uidx ON public.deliveries (event_id, athlete_id) WHERE status = 'active';
CREATE INDEX deliveries_event_time_idx ON public.deliveries (event_id, delivered_at);

-- AUDIT
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX audit_logs_event_idx ON public.audit_logs (event_id, created_at DESC);

-- POLICIES
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles insert self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "events read" ON public.events FOR SELECT TO authenticated USING (public.has_event_access(id));
CREATE POLICY "events insert admin" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "events update" ON public.events FOR UPDATE TO authenticated USING (public.can_manage_event(id)) WITH CHECK (public.can_manage_event(id));
CREATE POLICY "events delete admin" ON public.events FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "members read" ON public.event_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.can_manage_event(event_id));
CREATE POLICY "members manage" ON public.event_members FOR ALL TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));

CREATE POLICY "kits read" ON public.kits FOR SELECT TO authenticated USING (public.has_event_access(event_id));
CREATE POLICY "kits manage" ON public.kits FOR ALL TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));

CREATE POLICY "kit_items read" ON public.kit_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND public.has_event_access(k.event_id)));
CREATE POLICY "kit_items manage" ON public.kit_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND public.can_manage_event(k.event_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND public.can_manage_event(k.event_id)));

CREATE POLICY "locations read" ON public.pickup_locations FOR SELECT TO authenticated USING (public.has_event_access(event_id));
CREATE POLICY "locations manage" ON public.pickup_locations FOR ALL TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));

CREATE POLICY "inventory read" ON public.inventory FOR SELECT TO authenticated USING (public.has_event_access(event_id));
CREATE POLICY "inventory manage" ON public.inventory FOR ALL TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));
CREATE POLICY "inventory update staff" ON public.inventory FOR UPDATE TO authenticated USING (public.has_event_access(event_id)) WITH CHECK (public.has_event_access(event_id));

CREATE POLICY "athletes read" ON public.athletes FOR SELECT TO authenticated USING (public.has_event_access(event_id));
CREATE POLICY "athletes manage" ON public.athletes FOR ALL TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));
CREATE POLICY "athletes status update" ON public.athletes FOR UPDATE TO authenticated USING (public.has_event_access(event_id)) WITH CHECK (public.has_event_access(event_id));

CREATE POLICY "tpa read" ON public.third_party_authorizations FOR SELECT TO authenticated USING (public.has_event_access(event_id));
CREATE POLICY "tpa manage" ON public.third_party_authorizations FOR ALL TO authenticated USING (public.has_event_access(event_id)) WITH CHECK (public.has_event_access(event_id));

CREATE POLICY "deliveries read" ON public.deliveries FOR SELECT TO authenticated USING (public.has_event_access(event_id));
CREATE POLICY "deliveries insert" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (public.has_event_access(event_id));
CREATE POLICY "deliveries update admin" ON public.deliveries FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "audit read" ON public.audit_logs FOR SELECT TO authenticated USING (event_id IS NULL AND public.is_admin() OR public.can_manage_event(event_id));
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_count integer;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'attendant') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STOCK + ATHLETE STATUS ON DELIVERY
CREATE OR REPLACE FUNCTION public.handle_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.shirt_size IS NOT NULL AND NEW.shirt_size <> '' THEN
      UPDATE public.inventory SET quantity_current = quantity_current - 1
      WHERE event_id = NEW.event_id AND size = NEW.shirt_size AND item_type = 'camiseta';
    END IF;
    UPDATE public.athletes
      SET kit_status = CASE WHEN NEW.delivery_type = 'third_party' THEN 'third_party'::public.kit_status ELSE 'delivered'::public.kit_status END
      WHERE id = NEW.athlete_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'cancelled' THEN
    IF NEW.shirt_size IS NOT NULL AND NEW.shirt_size <> '' THEN
      UPDATE public.inventory SET quantity_current = quantity_current + 1
      WHERE event_id = NEW.event_id AND size = NEW.shirt_size AND item_type = 'camiseta';
    END IF;
    UPDATE public.athletes SET kit_status = 'pending' WHERE id = NEW.athlete_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deliveries_side_effects
AFTER INSERT OR UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.handle_delivery();

-- PUBLIC KIT LOOKUP
CREATE OR REPLACE FUNCTION public.public_kit_lookup(_slug text, _doc text)
RETURNS TABLE (
  athlete_id uuid, name text, bib_number text, modality text, category text,
  shirt_size text, kit_type text, kit_status public.kit_status, event_name text,
  delivered_at timestamptz, qr_payload text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.name, a.bib_number, a.modality, a.category, a.shirt_size, a.kit_type,
         a.kit_status, e.name,
         (SELECT d.delivered_at FROM public.deliveries d WHERE d.athlete_id = a.id AND d.status='active' LIMIT 1),
         'CRONOCHIP:' || e.id::text || ':' || a.id::text
  FROM public.athletes a
  JOIN public.events e ON e.id = a.event_id
  WHERE e.slug = _slug
    AND (regexp_replace(COALESCE(a.cpf,''), '\D', '', 'g') = regexp_replace(_doc, '\D', '', 'g')
         OR a.registration_number = _doc)
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.public_kit_lookup(text, text) TO anon, authenticated;

CREATE POLICY "events public read" ON public.events FOR SELECT TO anon USING (true);
