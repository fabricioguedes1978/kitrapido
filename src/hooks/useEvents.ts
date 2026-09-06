import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  allow_organizer_import: boolean;
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

/** Evento ativo compartilhado por todas as telas, persistido no dispositivo. */
let currentEventId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setCurrentEventId(id: string | null) {
  if (currentEventId === id) return;
  currentEventId = id;
  if (typeof window !== "undefined" && id) window.localStorage.setItem(STORAGE_KEY, id);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useCurrentEvent() {
  const { data: all = [], isLoading } = useEventsQuery();
  const { isAdmin, isOrganizer } = useAuth();
  // Eventos inativos ficam visíveis apenas para administrador e gerente.
  const events = isAdmin || isOrganizer ? all : all.filter((e) => !e.archived);
  const qc = useQueryClient();
  const eventId = useSyncExternalStore(
    subscribe,
    () => currentEventId,
    () => null,
  );

  useEffect(() => {
    if (typeof window === "undefined" || currentEventId) return;
    setCurrentEventId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  useEffect(() => {
    if (isLoading || events.length === 0) return;
    if (!eventId || !events.some((e) => e.id === eventId)) {
      setCurrentEventId(events[0]!.id);
    }
  }, [events, eventId, isLoading]);

  const select = useCallback(
    (id: string) => {
      setCurrentEventId(id);
      void qc.invalidateQueries();
    },
    [qc],
  );


  const event = events.find((e) => e.id === eventId) ?? null;
  return { events, event, eventId: event?.id ?? null, select, isLoading };
}
