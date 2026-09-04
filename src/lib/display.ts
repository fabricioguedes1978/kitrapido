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

/* ---------- Fundo personalizado da tela de conferência ---------- */

const BG_CHANNEL = "cronochip-display-bg";
const BG_KEY = "cronochip.display.bg";

export type DisplayBackground = {
  /** Imagem em data URL, ou null para usar o fundo padrão. */
  image: string | null;
  /** Escurecimento sobre a imagem (0 a 90). */
  dim: number;
};

export const DEFAULT_BACKGROUND: DisplayBackground = { image: null, dim: 55 };

export function readBackground(): DisplayBackground {
  if (typeof window === "undefined") return DEFAULT_BACKGROUND;
  try {
    const raw = window.localStorage.getItem(BG_KEY);
    return raw ? { ...DEFAULT_BACKGROUND, ...(JSON.parse(raw) as DisplayBackground) } : DEFAULT_BACKGROUND;
  } catch {
    return DEFAULT_BACKGROUND;
  }
}

export function publishBackground(bg: DisplayBackground) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BG_KEY, JSON.stringify(bg));
  } catch {
    /* armazenamento cheio ou indisponível */
  }
  if ("BroadcastChannel" in window) {
    const bc = new BroadcastChannel(BG_CHANNEL);
    bc.postMessage(bg);
    bc.close();
  }
}

export function subscribeBackground(handler: (bg: DisplayBackground) => void) {
  if (typeof window === "undefined") return () => {};
  let bc: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    bc = new BroadcastChannel(BG_CHANNEL);
    bc.onmessage = (event) => handler(event.data as DisplayBackground);
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === BG_KEY) {
      handler(event.newValue ? (JSON.parse(event.newValue) as DisplayBackground) : DEFAULT_BACKGROUND);
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
