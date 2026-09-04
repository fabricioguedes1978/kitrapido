import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  MonitorSmartphone,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QrScanDialog } from "@/components/QrScanDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";
import {
  formatDateTime,
  formatTime,
  logAudit,
  maskCPF,
  onlyDigits,
  parseQrPayload,
} from "@/lib/cronochip";
import { customFields, publishDisplay } from "@/lib/display";
import {
  cacheAthletes,
  enqueueDelivery,
  isQueuedAthlete,
  readCachedAthletes,
  syncQueue,
} from "@/lib/offline";

export const Route = createFileRoute("/_authenticated/central")({
  head: () => ({
    meta: [
      { title: "Central de Entrega — Cronochip Kit" },
      { name: "description", content: "Leia o QR Code ou pesquise o atleta e registre a entrega do kit." },
      { property: "og:title", content: "Central de Entrega — Cronochip Kit" },
      { property: "og:description", content: "Entrega de kits em segundos, com bloqueio de duplicidade." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Central,
});

type Athlete = {
  id: string;
  event_id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  registration_number: string | null;
  bib_number: string | null;
  modality: string | null;
  category: string | null;
  shirt_size: string | null;
  kit_type: string | null;
  kit_status: string;
  custom_1?: string | null;
  custom_2?: string | null;
  custom_3?: string | null;
  custom_4?: string | null;
  custom_5?: string | null;
};

type Delivery = {
  id: string;
  athlete_id: string;
  delivered_at: string;
  delivered_by_name: string | null;
  delivery_type: string;
  location_id: string | null;
  status: string;
};

function Central() {
  const { event, eventId } = useCurrentEvent();
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const [term, setTerm] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [method, setMethod] = useState<"qrcode" | "busca">("busca");
  const [confirming, setConfirming] = useState(false);
  const [asThirdParty, setAsThirdParty] = useState(false);
  const [success, setSuccess] = useState<{ name: string; bib: string | null; at: string } | null>(null);
  const [locationId, setLocationId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: athletes = [] } = useQuery({
    queryKey: ["athletes", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(
          "id,event_id,name,cpf,phone,registration_number,bib_number,modality,category,shirt_size,kit_type,kit_status,custom_1,custom_2,custom_3,custom_4,custom_5",
        )
        .eq("event_id", eventId!)
        .order("name");
      if (error) throw error;
      cacheAthletes(eventId!, data ?? []);
      return (data ?? []) as Athlete[];
    },
  });

  const roster = athletes.length > 0 ? athletes : readCachedAthletes<Athlete>(eventId ?? "");

  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("id,athlete_id,delivered_at,delivered_by_name,delivery_type,location_id,status")
        .eq("event_id", eventId!)
        .order("delivered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Delivery[];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data } = await supabase
        .from("pickup_locations")
        .select("id,name")
        .eq("event_id", eventId!)
        .order("date");
      return data ?? [];
    },
  });

  const { data: authorizations = [] } = useQuery({
    queryKey: ["tpa", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data } = await supabase
        .from("third_party_authorizations")
        .select("id,athlete_id,name,cpf,qr_code,status")
        .eq("event_id", eventId!)
        .eq("status", "active");
      return data ?? [];
    },
  });

  useEffect(() => {
    void syncQueue();
  }, []);

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (q.length < 2) return [];
    const digits = onlyDigits(q);
    return roster
      .filter((a) => {
        return (
          a.name.toLowerCase().includes(q) ||
          (a.bib_number ?? "").toLowerCase().includes(q) ||
          (a.registration_number ?? "").toLowerCase().includes(q) ||
          (digits.length >= 3 && onlyDigits(a.cpf).includes(digits)) ||
          (digits.length >= 4 && onlyDigits(a.phone).includes(digits))
        );
      })
      .slice(0, 25);
  }, [term, roster]);

  const activeDelivery = selected
    ? (deliveries.find((d) => d.athlete_id === selected.id && d.status === "active") ?? null)
    : null;
  const queuedOffline = selected ? isQueuedAthlete(selected.id) : false;
  const authorization = selected
    ? (authorizations.find((a) => a.athlete_id === selected.id) ?? null)
    : null;

  const todayCount = deliveries.filter(
    (d) => d.status === "active" && new Date(d.delivered_at).toDateString() === new Date().toDateString(),
  ).length;

  const extras = selected
    ? customFields(event?.custom_field_labels, [
        selected.custom_1,
        selected.custom_2,
        selected.custom_3,
        selected.custom_4,
        selected.custom_5,
      ])
    : [];

  useEffect(() => {
    if (!selected) return;
    publishDisplay({
      status: activeDelivery || queuedOffline ? "blocked" : "review",
      eventName: event?.name ?? null,
      name: selected.name,
      bib: selected.bib_number,
      shirt: selected.shirt_size,
      modality: selected.modality,
      category: selected.category,
      kit: selected.kit_type,
      registration: selected.registration_number,
      fields: extras,
    });
  }, [selected, activeDelivery, queuedOffline, event?.name, extras]);

  function handleScan(raw: string) {
    const parsed = parseQrPayload(raw);
    setMethod("qrcode");
    if (!parsed) { toast.error("QR Code não reconhecido."); return; }
    if (parsed.kind === "athlete") {
      const found = roster.find((a) => a.id === parsed.athleteId);
      if (!found) { toast.error("Atleta não encontrado neste evento."); return; }
      setAsThirdParty(false);
      setSelected(found);
      return;
    }
    const auth = authorizations.find((a) => a.qr_code === parsed.code);
    if (!auth) { toast.error("Autorização inválida ou cancelada."); return; }
    const found = roster.find((a) => a.id === auth.athlete_id);
    if (!found) { toast.error("Atleta da autorização não encontrado."); return; }
    setAsThirdParty(true);
    setSelected(found);
  }

  async function confirmDelivery() {
    if (!selected || !eventId) return;
    const payload = {
      event_id: eventId,
      athlete_id: selected.id,
      kit_name: selected.kit_type,
      shirt_size: selected.shirt_size,
      location_id: locationId || null,
      delivered_by: user?.id ?? null,
      delivered_by_name: profile?.name || profile?.email || null,
      delivery_type: (asThirdParty ? "third_party" : "athlete") as "third_party" | "athlete",
      third_party_name: asThirdParty ? (authorization?.name ?? null) : null,
      third_party_cpf: asThirdParty ? (authorization?.cpf ?? null) : null,
      identification_method: method,
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueDelivery({
        ...payload,
        localId: crypto.randomUUID(),
        athlete_name: selected.name,
        bib_number: selected.bib_number,
        kit_id: null,
        delivered_at: new Date().toISOString(),
      });
      finish();
      toast.warning("Entrega registrada offline. Será sincronizada ao voltar a conexão.");
      return;
    }

    const { error } = await supabase.from("deliveries").insert(payload);
    if (error) {
      if (error.code === "23505") {
        toast.error("Kit já entregue para este atleta.");
        await qc.invalidateQueries({ queryKey: ["deliveries", eventId] });
        setConfirming(false);
        return;
      }
      { toast.error("Falha ao registrar entrega", { description: error.message }); return; }
    }
    void logAudit({
      eventId,
      action: `Entrega de kit para ${selected.name} (nº ${selected.bib_number ?? "—"})`,
      entity: "deliveries",
      entityId: selected.id,
      newData: payload,
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries({ queryKey: ["deliveries", eventId] });
    await qc.invalidateQueries({ queryKey: ["athletes", eventId] });
    await qc.invalidateQueries({ queryKey: ["inventory", eventId] });
    finish();
  }

  function finish() {
    setSuccess({
      name: selected!.name,
      bib: selected!.bib_number,
      at: new Date().toISOString(),
    });
    publishDisplay({
      status: "delivered",
      eventName: event?.name ?? null,
      name: selected!.name,
      bib: selected!.bib_number,
    });
    setConfirming(false);
    setSelected(null);
    setTerm("");
    setAsThirdParty(false);
    setMethod("busca");
    setTimeout(() => {
      setSuccess(null);
      publishDisplay({ status: "idle" });
      inputRef.current?.focus();
    }, 4000);
  }

  if (!eventId) {
    return (
      <AppShell>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              Nenhum evento disponível. Peça a um administrador para criar um evento e vincular você a
              ele.
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (success) {
    return (
      <AppShell>
        <div className="bg-success/12 border-success/30 flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-2xl border p-8 text-center">
          <CheckCircle2 className="text-success size-20" />
          <h1 className="text-success text-3xl font-extrabold">KIT ENTREGUE COM SUCESSO ✓</h1>
          <p className="text-2xl font-bold">{success.name}</p>
          <p className="text-lg font-semibold">Nº {success.bib ?? "—"}</p>
          <p className="text-muted-foreground text-sm">
            {formatTime(success.at)} · {profile?.name || profile?.email}
          </p>
          <Button className="mt-4" size="lg" onClick={() => setSuccess(null)}>
            Próximo atleta
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">Cronochip Kit</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Central de Entrega</h1>
          <p className="text-muted-foreground truncate text-sm">{event?.name}</p>
        </header>

        {!selected && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="lg" className="h-20 text-lg" onClick={() => setScanOpen(true)}>
                <Camera className="size-7" /> LER QR CODE
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="h-20 text-lg"
                onClick={() => inputRef.current?.focus()}
              >
                <Search className="size-7" /> PESQUISAR ATLETA
              </Button>
            </div>

            <div className="relative mt-4">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" />
              <Input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Nome, CPF, inscrição, nº de peito ou telefone"
                className="h-14 pl-11 text-base"
                autoComplete="off"
              />
            </div>

            {results.length > 0 && (
              <div className="mt-3 space-y-2">
                {results.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelected(a);
                      setMethod("busca");
                    }}
                    className="bg-card hover:border-primary grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        Nº {a.bib_number ?? "—"} · {a.modality ?? "—"} · {maskCPF(a.cpf)}
                      </p>
                    </div>
                    <Badge variant={a.kit_status === "pending" ? "secondary" : "outline"}>
                      {a.kit_status === "pending" ? "Pendente" : "Entregue"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            <section className="mt-8">
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <h2 className="text-lg font-bold">Últimas entregas</h2>
                <span className="text-primary text-sm font-bold">Hoje: {todayCount}</span>
              </div>
              <Card>
                <CardContent className="divide-border divide-y p-0">
                  {deliveries.filter((d) => d.status === "active").length === 0 && (
                    <p className="text-muted-foreground p-4 text-sm">Nenhuma entrega registrada ainda.</p>
                  )}
                  {deliveries
                    .filter((d) => d.status === "active")
                    .slice(0, 8)
                    .map((d) => {
                      const a = roster.find((x) => x.id === d.athlete_id);
                      return (
                        <div
                          key={d.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                        >
                          <p className="truncate text-sm font-medium">
                            {a?.name ?? "Atleta"} — nº {a?.bib_number ?? "—"}
                          </p>
                          <span className="text-muted-foreground numeric shrink-0 text-sm">
                            {formatTime(d.delivered_at)}
                          </span>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </section>
          </>
        )}

        {selected && (
          <Card className="shadow-card">
            <CardContent className="space-y-5 pt-6">
              {(activeDelivery || queuedOffline) && (
                <div className="border-destructive/40 bg-destructive/10 rounded-xl border p-4">
                  <p className="text-destructive flex items-center gap-2 text-lg font-extrabold">
                    <AlertTriangle className="size-6" /> KIT JÁ ENTREGUE
                  </p>
                  <dl className="mt-3 space-y-1 text-sm">
                    <p>
                      <strong>{selected.name}</strong>
                    </p>
                    {activeDelivery && (
                      <>
                        <p>Data e horário: {formatDateTime(activeDelivery.delivered_at)}</p>
                        <p>
                          Local:{" "}
                          {locations.find((l) => l.id === activeDelivery.location_id)?.name ??
                            "Não informado"}
                        </p>
                        <p>Atendente: {activeDelivery.delivered_by_name ?? "—"}</p>
                      </>
                    )}
                    {!activeDelivery && queuedOffline && <p>Registrada offline, aguardando sincronização.</p>}
                  </dl>
                  <p className="text-muted-foreground mt-3 text-xs">
                    Uma nova entrega só pode ser autorizada por um administrador na tela de Entregas.
                  </p>
                </div>
              )}

              {asThirdParty && authorization && (
                <div className="border-warning/40 bg-warning/15 rounded-xl border p-4">
                  <p className="flex items-center gap-2 text-base font-extrabold">
                    <UserCheck className="size-5" /> RETIRADA POR TERCEIRO
                  </p>
                  <p className="mt-1 text-sm">
                    Autorizado: <strong>{authorization.name}</strong> · CPF {maskCPF(authorization.cpf)}
                  </p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground text-xs tracking-wide uppercase">Atleta</p>
                <p className="text-2xl font-extrabold">{selected.name}</p>
              </div>

              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Info label="Nº peito" value={selected.bib_number} big />
                <Info label="Camiseta" value={selected.shirt_size} big />
                <Info label="Kit" value={selected.kit_type} />
                <Info label="Modalidade" value={selected.modality} />
                <Info label="Categoria" value={selected.category} />
                <Info label="Inscrição" value={selected.registration_number} />
                {extras.map((f) => (
                  <Info key={f.label} label={f.label} value={f.value} />
                ))}
              </dl>

              {locations.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">Local de retirada</p>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione o local" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!activeDelivery && !queuedOffline && authorization && !asThirdParty && (
                <Button variant="outline" className="w-full" onClick={() => setAsThirdParty(true)}>
                  <UserCheck className="size-4" /> Entregar a terceiro autorizado ({authorization.name})
                </Button>
              )}

              {confirming ? (
                <div className="bg-muted space-y-3 rounded-xl p-4">
                  <p className="text-center font-semibold">Confirme a entrega do kit para este atleta.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button size="lg" className="h-14" onClick={() => void confirmDelivery()}>
                      CONFIRMAR ENTREGA
                    </Button>
                    <Button size="lg" variant="outline" className="h-14" onClick={() => setConfirming(false)}>
                      CANCELAR
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Button
                    size="lg"
                    className="h-16 text-lg"
                    disabled={!!activeDelivery || queuedOffline}
                    onClick={() => setConfirming(true)}
                  >
                    ENTREGAR KIT
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16"
                    onClick={() => {
                      setSelected(null);
                      setAsThirdParty(false);
                    }}
                  >
                    <X className="size-5" /> Voltar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} onResult={handleScan} />
      </div>
    </AppShell>
  );
}

function Info({ label, value, big }: { label: string; value?: string | null; big?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">{label}</dt>
      <dd className={big ? "text-xl font-extrabold" : "truncate font-semibold"}>{value || "—"}</dd>
    </div>
  );
}
