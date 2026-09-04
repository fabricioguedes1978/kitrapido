import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEventsQuery, type EventRow } from "@/hooks/useEvents";
import { EVENT_STATUS, formatDate, logAudit, slugify } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos — Cronochip Kit" },
      { name: "description", content: "Cadastre e gerencie os eventos esportivos e suas entregas de kit." },
      { property: "og:title", content: "Eventos — Cronochip Kit" },
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
  description: "",
  modalities: "",
  status: "planning",
  custom_field_labels: ["", "", "", "", ""] as string[],
};

function Eventos() {
  const { data: events = [] } = useEventsQuery();
  const { isAdmin, profile, user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

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
      description: e.description ?? "",
      modalities: (e.modalities ?? []).join(", "),
      status: e.status,
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
      description: form.description || null,
      modalities: form.modalities
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      status: form.status as "planning",
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
        subtitle="Provas e entregas de kit gerenciadas pela Cronochip"
        action={
          isAdmin ? (
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
                <Badge variant="secondary" className="shrink-0">
                  {EVENT_STATUS[e.status] ?? e.status}
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
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(e)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/evento/${e.slug}/kit`} target="_blank" rel="noreferrer">
                    Página do atleta
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum evento cadastrado.</p>
        )}
      </div>

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
            <Field label="Modalidades (separadas por vírgula)">
              <Input
                placeholder="5km, 10km, 21km"
                value={form.modalities}
                onChange={(e) => setForm({ ...form, modalities: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_STATUS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Descrição">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button onClick={() => void save()} disabled={saving}>
              Salvar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
