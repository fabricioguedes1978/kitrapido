import { supabase } from "@/integrations/supabase/client";

/**
 * Fila offline de entregas.
 * Durante instabilidade de internet a entrega é gravada localmente e
 * sincronizada automaticamente quando a conexão retorna.
 */

const QUEUE_KEY = "cronochip.deliveryQueue";
const CACHE_KEY = "cronochip.athleteCache";

export type QueuedDelivery = {
  localId: string;
  event_id: string;
  athlete_id: string;
  athlete_name: string;
  bib_number: string | null;
  kit_id: string | null;
  kit_name: string | null;
  shirt_size: string | null;
  location_id: string | null;
  delivered_by: string | null;
  delivered_by_name: string | null;
  delivery_type: "athlete" | "third_party";
  third_party_name: string | null;
  third_party_cpf: string | null;
  identification_method: string;
  delivered_at: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeQueue(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read(): QueuedDelivery[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedDelivery[];
  } catch {
    return [];
  }
}

function write(items: QueuedDelivery[]) {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  notify();
}

export function pendingCount() {
  return read().length;
}

export function queuedForEvent(eventId: string) {
  return read().filter((d) => d.event_id === eventId);
}

export function isQueuedAthlete(athleteId: string) {
  return read().some((d) => d.athlete_id === athleteId);
}

export function enqueueDelivery(delivery: QueuedDelivery) {
  write([...read(), delivery]);
}

let syncing = false;

export async function syncQueue() {
  if (syncing || typeof navigator === "undefined" || !navigator.onLine) return;
  const items = read();
  if (items.length === 0) return;
  syncing = true;
  const remaining: QueuedDelivery[] = [];
  for (const item of items) {
    const { localId, athlete_name, bib_number, ...payload } = item;
    void localId;
    void athlete_name;
    void bib_number;
    const { error } = await supabase.from("deliveries").insert(payload);
    // 23505 = entrega duplicada; descarta o item para não travar a fila.
    if (error && error.code !== "23505") remaining.push(item);
  }
  write(remaining);
  syncing = false;
}

/** Cache local dos atletas para consulta offline. */
export function cacheAthletes(eventId: string, athletes: unknown[]) {
  try {
    window.localStorage.setItem(`${CACHE_KEY}.${eventId}`, JSON.stringify(athletes));
  } catch {
    /* quota excedida — segue online */
  }
}

export function readCachedAthletes<T>(eventId: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(`${CACHE_KEY}.${eventId}`) ?? "[]") as T[];
  } catch {
    return [];
  }
}
