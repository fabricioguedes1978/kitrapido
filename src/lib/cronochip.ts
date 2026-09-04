import { supabase } from "@/integrations/supabase/client";

export const SHIRT_SIZES = ["PP", "P", "M", "G", "GG", "XG"] as const;

export const EVENT_STATUS: Record<string, string> = {
  planning: "Planejamento",
  registrations_open: "Inscrições abertas",
  registrations_closed: "Inscrições encerradas",
  kit_delivery: "Entrega de kits",
  completed: "Evento realizado",
  closed: "Encerrado",
};

export const KIT_STATUS: Record<string, string> = {
  pending: "Aguardando retirada",
  delivered: "Entregue",
  third_party: "Retirada por terceiro",
  blocked: "Bloqueado",
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador Cronochip",
  organizer: "Organizador",
  attendant: "Atendente",
};

export type AppRole = "admin" | "organizer" | "attendant";

export function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidCPF(value: string | null | undefined) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

/** LGPD: nunca exibir o CPF completo na interface. */
export function maskCPF(value: string | null | undefined) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return value ? "•••" : "—";
  return `•••.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-••`;
}

export function formatCPF(value: string | null | undefined) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return value ?? "";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function qrPayload(eventId: string, athleteId: string) {
  return `CRONOCHIP:${eventId}:${athleteId}`;
}

export function parseQrPayload(raw: string) {
  const parts = raw.trim().split(":");
  if (parts[0] === "CRONOCHIP" && parts.length >= 3) {
    return { kind: "athlete" as const, eventId: parts[1]!, athleteId: parts[2]! };
  }
  if (parts[0] === "CRONOCHIP-AUTH" && parts.length >= 2) {
    return { kind: "third_party" as const, code: parts[1]! };
  }
  return null;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (y && m && d) return `${d}/${m}/${y}`;
  return new Date(value).toLocaleDateString("pt-BR");
}

export async function logAudit(entry: {
  eventId?: string | null;
  action: string;
  entity?: string;
  entityId?: string | null;
  oldData?: unknown;
  newData?: unknown;
  userName?: string | null;
}) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_logs").insert({
    user_id: data.user.id,
    user_name: entry.userName ?? data.user.email ?? null,
    event_id: entry.eventId ?? null,
    action: entry.action,
    entity: entry.entity ?? null,
    entity_id: entry.entityId ?? null,
    old_data: (entry.oldData ?? null) as never,
    new_data: (entry.newData ?? null) as never,
  });
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
