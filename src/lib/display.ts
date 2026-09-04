/** Canal de comunicação entre a Central de Entrega e a tela de conferência do atleta. */

export type DisplayField = { label: string; value: string };

export type DisplayState = {
  status: "idle" | "review" | "delivered" | "blocked";
  eventName?: string | null;
  name?: string | null;
  bib?: string | null;
  shirt?: string | null;
  modality?: string | null;
  category?: string | null;
  kit?: string | null;
  registration?: string | null;
  fields?: DisplayField[];
  at: number;
};

const CHANNEL = "cronochip-display";
const STORAGE_KEY = "cronochip.display";

export const IDLE_STATE: DisplayState = { status: "idle", at: 0 };

export function publishDisplay(state: Omit<DisplayState, "at">) {
  if (typeof window === "undefined") return;
  const payload: DisplayState = { ...state, at: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* armazenamento indisponível */
  }
  if ("BroadcastChannel" in window) {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage(payload);
    bc.close();
  }
}

export function readDisplay(): DisplayState {
  if (typeof window === "undefined") return IDLE_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DisplayState) : IDLE_STATE;
  } catch {
    return IDLE_STATE;
  }
}

export function subscribeDisplay(handler: (state: DisplayState) => void) {
  if (typeof window === "undefined") return () => {};
  let bc: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (event) => handler(event.data as DisplayState);
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      handler(JSON.parse(event.newValue) as DisplayState);
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    bc?.close();
    window.removeEventListener("storage", onStorage);
  };
}

/** Campos personalizados preenchidos, já com os rótulos configurados no evento. */
export function customFields(
  labels: (string | null | undefined)[] | null | undefined,
  values: (string | null | undefined)[],
): DisplayField[] {
  return values
    .map((value, index) => ({
      label: (labels?.[index] || `Campo ${index + 1}`).trim(),
      value: (value ?? "").trim(),
    }))
    .filter((f) => f.value.length > 0);
}
