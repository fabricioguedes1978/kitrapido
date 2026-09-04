ALTER TABLE public.athletes DROP CONSTRAINT athletes_event_id_fkey,
  ADD CONSTRAINT athletes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.kits DROP CONSTRAINT kits_event_id_fkey,
  ADD CONSTRAINT kits_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.kit_items DROP CONSTRAINT kit_items_kit_id_fkey,
  ADD CONSTRAINT kit_items_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.kits(id) ON DELETE CASCADE;
ALTER TABLE public.inventory DROP CONSTRAINT inventory_event_id_fkey,
  ADD CONSTRAINT inventory_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.pickup_locations DROP CONSTRAINT pickup_locations_event_id_fkey,
  ADD CONSTRAINT pickup_locations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.third_party_authorizations DROP CONSTRAINT third_party_authorizations_event_id_fkey,
  ADD CONSTRAINT third_party_authorizations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.third_party_authorizations DROP CONSTRAINT third_party_authorizations_athlete_id_fkey,
  ADD CONSTRAINT third_party_authorizations_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;
ALTER TABLE public.event_members DROP CONSTRAINT event_members_event_id_fkey,
  ADD CONSTRAINT event_members_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.deliveries DROP CONSTRAINT deliveries_event_id_fkey,
  ADD CONSTRAINT deliveries_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.deliveries DROP CONSTRAINT deliveries_athlete_id_fkey,
  ADD CONSTRAINT deliveries_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;
ALTER TABLE public.deliveries DROP CONSTRAINT deliveries_kit_id_fkey,
  ADD CONSTRAINT deliveries_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.kits(id) ON DELETE SET NULL;
ALTER TABLE public.deliveries DROP CONSTRAINT deliveries_location_id_fkey,
  ADD CONSTRAINT deliveries_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.pickup_locations(id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_event_id_fkey,
  ADD CONSTRAINT audit_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;