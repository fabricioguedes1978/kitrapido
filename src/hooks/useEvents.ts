import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EventRow = {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
  event_time: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  description: string | null;
  logo_url: string | null;
  modalities: string[];
  custom_field_labels: string[];
  status: string;
  archived: boolean;
  athletes_lock_at: string | null;
  created_at: string;
};

const STORAGE_KEY = "cronochip.event";

export function useEventsQuery() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });
}

/** Evento ativo, persistido no dispositivo do atendente. */
export function useCurrentEvent() {
  const { data: all = [], isLoading } = useEventsQuery();
  const events = all.filter((e) => !e.archived);
  const qc = useQueryClient();
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEventId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  useEffect(() => {
    if (isLoading || events.length === 0) return;
    if (!eventId || !events.some((e) => e.id === eventId)) {
      const next = events[0]!.id;
      setEventId(next);
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, [events, eventId, isLoading]);

  const select = useCallback(
    (id: string) => {
      window.localStorage.setItem(STORAGE_KEY, id);
      setEventId(id);
      void qc.invalidateQueries();
    },
    [qc],
  );

  const event = events.find((e) => e.id === eventId) ?? null;
  return { events, event, eventId: event?.id ?? null, select, isLoading };
}
