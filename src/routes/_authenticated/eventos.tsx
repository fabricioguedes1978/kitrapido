import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Eye, EyeOff, FolderOpen, Plus, QrCode, Trash2, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QRCodeSVG } from "qrcode.react";
import { downloadCredentialPng } from "@/lib/credential";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent, useEventsQuery, type EventRow } from "@/hooks/useEvents";
import { checkinUrl, formatDate, logAudit, slugify } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos — Kit Rápido" },
      { name: "description", content: "Cadastre e gerencie os eventos esportivos e suas entregas de kit." },
      { property: "og:title", content: "Eventos — Kit Rápido" },
      { property: "og:description", content: "Gestão de eventos, datas, locais e modalidades." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Eventos,
});

const EMPTY = {
  name: "",
  event_date: "",
  event_time: "",
  city: "",
  state: "",
  address: "",
  start_location: "",
  pickup_address: "",
  pickup_city: "",
  pickup_days: "",
  pickup_start_time: "",
  pickup_end_time: "",
  description: "",
  modalities: "",
  archived: false,
  athletes_lock_at: "",
  allow_organizer_import: false,
  custom_field_labels: ["", "", "", "", ""] as string[],
};

/** ISO -> valor do input datetime-local (horário local do navegador). */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Eventos() {
  const { data: events = [] } = useEventsQuery();
  const { isAdmin, isOrganizer, profile, user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { select } = useCurrentEvent();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [poster, setPoster] = useState<EventRow | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [removing, setRemoving] = useState<EventRow | null>(null);
  const [viewing, setViewing] = useState<EventRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggleArchived(e: EventRow) {
    const next = !e.archived;
    const { error } = await supabase.from("events").update({ archived: next }).eq("id", e.id);
    if (error) {
      toast.error("Não foi possível alterar o evento", { description: error.message });
      return;
    }
    void logAudit({
      eventId: e.id,
      action: next ? `Inativou o evento ${e.name}` : `Reativou o evento ${e.name}`,
      entity: "events",
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries();
    toast.success(next ? "Evento inativado." : "Evento reativado.");
  }

  async function removeEvent() {
    if (!removing) return;
    setBusy(true);
    const { error } = await supabase.from("events").delete().eq("id", removing.id);
    setBusy(false);
    if (error) {
      toast.error("Não foi possível excluir", { description: error.message });
      return;
    }
    void logAudit({
      eventId: null,
      action: `Excluiu o evento ${removing.name}`,
      entity: "events",
      userName: profile?.name ?? null,
    });
    setRemoving(null);
    await qc.invalidateQueries();
    toast.success("Evento excluído.");
  }


  async function downloadPoster() {
    const svg = posterRef.current?.querySelector("svg");
    if (!poster || !svg) return;
    await downloadCredentialPng(
      {
        eventName: poster.name,
        name: "CHECK-IN DO ATLETA",
        rows: [
          { label: "Como usar", value: "Aponte a câmera do celular" },
          { label: "Depois", value: "Informe CPF ou inscrição" },
          { label: "Resultado", value: "Seus dados e o QR do kit" },
        ],
        footer: checkinUrl(poster.slug),
      },
      svg,
      `qr-checkin-${poster.slug}.png`,
    );
  }


  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(e: EventRow) {
    setEditing(e);
    setForm({
      name: e.name,
      event_date: e.event_date ?? "",
      event_time: e.event_time?.slice(0, 5) ?? "",
      city: e.city ?? "",
      state: e.state ?? "",
      address: e.address ?? "",
      start_location: e.start_location ?? "",
      pickup_address: e.pickup_address ?? "",
      pickup_city: e.pickup_city ?? "",
      pickup_days: e.pickup_days ?? "",
      pickup_start_time: e.pickup_start_time?.slice(0, 5) ?? "",
      pickup_end_time: e.pickup_end_time?.slice(0, 5) ?? "",
      description: e.description ?? "",
      modalities: (e.modalities ?? []).join(", "),
      archived: !!e.archived,
      athletes_lock_at: toLocalInput(e.athletes_lock_at),
      allow_organizer_import: !!e.allow_organizer_import,
      custom_field_labels: [0, 1, 2, 3, 4].map((i) => e.custom_field_labels?.[i] ?? ""),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Informe o nome do evento."); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: editing?.slug ?? `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`,
      event_date: form.event_date || null,
      event_time: form.event_time || null,
      city: form.city || null,
      state: form.state || null,
      address: form.address || null,
      start_location: form.start_location || null,
      pickup_address: form.pickup_address || null,
      pickup_city: form.pickup_city || null,
      pickup_days: form.pickup_days || null,
      pickup_start_time: form.pickup_start_time || null,
      pickup_end_time: form.pickup_end_time || null,
      description: form.description || null,
      modalities: form.modalities
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      status: (editing?.status ?? "planning") as "planning",
      archived: form.archived,
      custom_field_labels: form.custom_field_labels.map((l) => l.trim()),
      ...(isAdmin
        ? {
            athletes_lock_at: form.athletes_lock_at
              ? new Date(form.athletes_lock_at).toISOString()
              : null,
            allow_organizer_import: form.allow_organizer_import,
          }
        : {}),
    };

    const { error } = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase.from("events").insert({ ...payload, created_by: user?.id ?? null });

    setSaving(false);
    if (error) { toast.error("Não foi possível salvar", { description: error.message }); return; }
    void logAudit({
      eventId: editing?.id ?? null,
      action: editing ? `Editou o evento ${payload.name}` : `Criou o evento ${payload.name}`,
      entity: "events",
      newData: payload,
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries({ queryKey: ["events"] });
    setOpen(false);
    toast.success("Evento salvo.");
  }

  return (
    <AppShell>
      <PageHeader
        title="Eventos"
        subtitle="Provas e entregas de kit gerenciadas pelo Kit Rápido"
        action={
          isAdmin || isOrganizer ? (
            <Button onClick={openNew}>
              <Plus className="size-4" /> Novo evento
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {events.map((e) => (
          <Card key={e.id} className="shadow-card">
            <CardContent className="space-y-2 py-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <h2 className="min-w-0 truncate text-lg font-bold">{e.name}</h2>
                <Badge
                  variant={e.archived ? "destructive" : "secondary"}
                  className="shrink-0 font-bold uppercase"
                >
                  {e.archived ? "Inativo" : "Ativo"}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {formatDate(e.event_date)} {e.event_time ? `· ${e.event_time.slice(0, 5)}` : ""}
              </p>
              <p className="text-muted-foreground truncate text-sm">
                {[e.city, e.state].filter(Boolean).join("/") || "Local não informado"}
              </p>
              {e.modalities?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {e.modalities.map((m) => (
                    <Badge key={m} variant="outline">
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setViewing(e)}>
                  <FolderOpen className="size-4" /> Abrir
                </Button>
                {(isAdmin || isOrganizer) && (
                  <Button variant="outline" size="sm" onClick={() => openEdit(e)}>
                    Editar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    select(e.id);
                    void navigate({ to: "/usuarios" });
                  }}
                >
                  <Users className="size-4" /> Gerente e staff
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPoster(e)}>
                  <QrCode className="size-4" /> QR de check-in
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/evento/${e.slug}/kit`} target="_blank" rel="noreferrer">
                    Página do atleta
                  </a>
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant={e.archived ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => void toggleArchived(e)}
                    >
                      {e.archived ? (
                        <>
                          <Eye className="size-4" /> Reativar
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-4" /> Inativar
                        </>
                      )}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setRemoving(e)}>
                      <Trash2 className="size-4" /> Excluir
                    </Button>
                  </>
                )}
              </div>
              {e.archived && (
                <p className="text-muted-foreground pt-1 text-xs">
                  Evento inativo: visível apenas para administrador e gerente.
                </p>
              )}

            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum evento cadastrado.</p>
        )}
      </div>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Situação">
                <Badge variant={viewing.archived ? "destructive" : "secondary"} className="font-bold uppercase">
                  {viewing.archived ? "Inativo" : "Ativo"}
                </Badge>
              </Detail>
              <Detail label="Data e horário">
                {formatDate(viewing.event_date)}{" "}
                {viewing.event_time ? `às ${viewing.event_time.slice(0, 5)}` : ""}
              </Detail>
              <Detail label="Cidade/UF">
                {[viewing.city, viewing.state].filter(Boolean).join("/") || "—"}
              </Detail>
              <Detail label="Endereço">{viewing.address || "—"}</Detail>
              <Detail label="Local de largada">{viewing.start_location || "—"}</Detail>
              <Detail label="Retirada do kit" full>
                {[
                  viewing.pickup_address,
                  viewing.pickup_city,
                  viewing.pickup_days,
                  viewing.pickup_start_time && viewing.pickup_end_time
                    ? `${viewing.pickup_start_time.slice(0, 5)} às ${viewing.pickup_end_time.slice(0, 5)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Detail>
              <Detail label="Modalidades">
                {viewing.modalities?.length ? viewing.modalities.join(", ") : "—"}
              </Detail>
              <Detail label="Fecha cadastro de atletas em">
                {viewing.athletes_lock_at
                  ? new Date(viewing.athletes_lock_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "24h antes do evento (automático)"}
              </Detail>
              <Detail label="Gerente pode enviar planilha">
                {viewing.allow_organizer_import ? "Sim" : "Não (somente administrador)"}
              </Detail>
              {viewing.custom_field_labels?.some((l) => l?.trim()) && (
                <Detail label="Campos personalizados" full>
                  {viewing.custom_field_labels.filter((l) => l?.trim()).join(", ")}
                </Detail>
              )}
              {viewing.description && (
                <Detail label="Descrição" full>
                  {viewing.description}
                </Detail>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              Fechar
            </Button>
            {(isAdmin || isOrganizer) && viewing && (
              <Button
                onClick={() => {
                  openEdit(viewing);
                  setViewing(null);
                }}
              >
                Editar evento
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!poster} onOpenChange={(v) => !v && setPoster(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR de check-in — {poster?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <div ref={posterRef} className="rounded-xl border bg-white p-4">
              {poster && <QRCodeSVG value={checkinUrl(poster.slug)} size={220} level="M" />}
            </div>
            <p className="text-muted-foreground text-center text-xs">
              Imprima e coloque no local do evento. O atleta aponta a câmera, confere os dados e salva
              a credencial com o QR Code que o atendente lê para dar baixa no kit.
            </p>
            <Button className="w-full" onClick={() => void downloadPoster()}>
              <Download className="size-4" /> Baixar cartaz em imagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>

        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Nome do evento">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                />
              </Field>
              <Field label="Horário">
                <Input
                  type="time"
                  value={form.event_time}
                  onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                />
              </Field>
              <Field label="Cidade">
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
              <Field label="UF">
                <Input
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                />
              </Field>
            </div>
            <Field label="Endereço">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Local de largada">
              <Input
                placeholder="Ex.: Praça da Liberdade"
                value={form.start_location}
                onChange={(e) => setForm({ ...form, start_location: e.target.value })}
              />
            </Field>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-semibold">Local da retirada do kit</p>
              <p className="text-muted-foreground text-xs">
                Estes dados aparecem no voucher do atleta.
              </p>
              <Field label="Endereço da retirada">
                <Input
                  value={form.pickup_address}
                  onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
                />
              </Field>
              <Field label="Cidade da retirada">
                <Input
                  value={form.pickup_city}
                  onChange={(e) => setForm({ ...form, pickup_city: e.target.value })}
                />
              </Field>
              <Field label="Dias da retirada">
                <Input
                  placeholder="Ex.: 12 e 13 de setembro"
                  value={form.pickup_days}
                  onChange={(e) => setForm({ ...form, pickup_days: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Início">
                  <Input
                    type="time"
                    value={form.pickup_start_time}
                    onChange={(e) => setForm({ ...form, pickup_start_time: e.target.value })}
                  />
                </Field>
                <Field label="Término">
                  <Input
                    type="time"
                    value={form.pickup_end_time}
                    onChange={(e) => setForm({ ...form, pickup_end_time: e.target.value })}
                  />
                </Field>
              </div>
            </div>
            <Field label="Modalidades (separadas por vírgula)">
              <Input
                placeholder="5km, 10km, 21km"
                value={form.modalities}
                onChange={(e) => setForm({ ...form, modalities: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.archived ? "inativo" : "ativo"}
                onValueChange={(v) => setForm({ ...form, archived: v === "inativo" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Inativo: some para atendentes e atletas; somente administrador e gerente continuam
                acessando.
              </p>
            </Field>
            {isAdmin && (
              <Field label="Fechar cadastro e alteração de atletas em">
                <Input
                  type="datetime-local"
                  value={form.athletes_lock_at}
                  onChange={(e) => setForm({ ...form, athletes_lock_at: e.target.value })}
                />
                <p className="text-muted-foreground text-xs">
                  Depois desta data e horário, gerentes e equipe não conseguem mais incluir nem
                  alterar atletas. Se deixar em branco, o sistema usa automaticamente 24 horas antes
                  do início do evento. Somente o administrador pode mudar este prazo.
                </p>
              </Field>
            )}
            {isAdmin && (
              <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Gerente pode enviar a planilha de inscritos</p>
                  <p className="text-muted-foreground text-xs">
                    Quando desligado, apenas o administrador envia a planilha de inscritos deste
                    evento. Ligue para autorizar o gerente a fazer o envio.
                  </p>
                </div>
                <Switch
                  checked={form.allow_organizer_import}
                  onCheckedChange={(v) => setForm({ ...form, allow_organizer_import: v })}
                />
              </div>
            )}
            <Field label="Descrição">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-semibold">Campos personalizados</p>
              <p className="text-muted-foreground text-xs">
                Dê um nome a até 5 campos extras (ex.: Chip, Ônibus, Lote, Camarote). Eles aparecem na
                entrega e na tela do atleta somente quando estiverem preenchidos na planilha.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {form.custom_field_labels.map((label, i) => (
                  <Input
                    key={i}
                    placeholder={`Campo ${i + 1}`}
                    value={label}
                    onChange={(e) => {
                      const next = [...form.custom_field_labels];
                      next[i] = e.target.value;
                      setForm({ ...form, custom_field_labels: next });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void save()} disabled={saving}>
              Salvar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o evento {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é definitiva e apaga também atletas, kits, estoque e entregas desse evento. Se
              quiser apenas esconder o evento de todos, use "Inativar".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void removeEvent()}>
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Detail({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
