import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  MonitorSmartphone,
  Package,
  ScanLine,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QrScanDialog } from "@/components/QrScanDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";
import {
  athleteQrUrl,
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
  validateSearch: (search: Record<string, unknown>): { atleta?: string } =>
    typeof search["atleta"] === "string" ? { atleta: search["atleta"] as string } : {},
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
  city: string | null;
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
  const { user, profile, isAdmin, isOrganizer } = useAuth();
  const canCancel = isAdmin || isOrganizer;
  const qc = useQueryClient();

  const [term, setTerm] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [method, setMethod] = useState<"qrcode" | "busca">("busca");
  const [confirming, setConfirming] = useState(false);
  const [asThirdParty, setAsThirdParty] = useState(false);
  const [success, setSuccess] = useState<{ name: string; bib: string | null; at: string } | null>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: athletes = [] } = useQuery({
    queryKey: ["athletes", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(
          "id,event_id,name,cpf,phone,registration_number,bib_number,modality,category,city,shirt_size,kit_type,kit_status,custom_1,custom_2,custom_3,custom_4,custom_5",
        )
        .eq("event_id", eventId!)
        .order("name");
      if (error) throw error;
      cacheAthletes(eventId!, data ?? []);
      return (data ?? []) as Athlete[];
    },
  });

  const roster = athletes.length > 0 ? athletes : readCachedAthletes<Athlete>(eventId ?? "");

  // Abertura direta pelo QR Code do atleta (/central?atleta=<id>)
  const { atleta } = Route.useSearch();
  const navigate = useNavigate();
  useEffect(() => {
    if (!atleta || roster.length === 0) return;
    const found = roster.find((a) => a.id === atleta);
    if (found) {
      setSelected(found);
      setMethod("qrcode");
    } else {
      toast.error("Atleta não encontrado neste evento. Selecione o evento correspondente.");
    }
    void navigate({ to: "/central", search: {}, replace: true });
  }, [atleta, roster, navigate]);


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

  const labelsKey = (event?.custom_field_labels ?? []).join("|");
  const extras = useMemo(
    () =>
      selected
        ? customFields(labelsKey.split("|"), [
            selected.custom_1,
            selected.custom_2,
            selected.custom_3,
            selected.custom_4,
            selected.custom_5,
          ])
        : [],
    [selected, labelsKey],
  );

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

  async function cancelDelivery() {
    if (!activeDelivery || !selected) return;
    if (!cancelReason.trim()) { toast.error("Descreva o motivo do cancelamento."); return; }
    setCancelling(true);
    const { error } = await supabase
      .from("deliveries")
      .update({
        status: "cancelled",
        cancel_reason: cancelReason.trim(),
        cancelled_at: new Date().toISOString(),
        cancelled_by: user?.id ?? null,
      })
      .eq("id", activeDelivery.id);
    setCancelling(false);
    if (error) { toast.error("Não foi possível cancelar", { description: error.message }); return; }
    void logAudit({
      eventId,
      action: `Cancelou a entrega de ${selected.name} (nº ${selected.bib_number ?? "—"}): ${cancelReason.trim()}`,
      entity: "deliveries",
      entityId: activeDelivery.id,
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries({ queryKey: ["deliveries", eventId] });
    await qc.invalidateQueries({ queryKey: ["athletes", eventId] });
    await qc.invalidateQueries({ queryKey: ["inventory", eventId] });
    setCancelOpen(false);
    setCancelReason("");
    publishDisplay({ status: "idle" });
    toast.success("Entrega cancelada. O atleta voltou para pendente.");
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

  const stats = useMemo(() => {
    const total = roster.length;
    const delivered = deliveries.filter((d) => d.status === "active").length;
    const pending = total - delivered;
    const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    return { total, delivered, pending, rate };
  }, [roster, deliveries]);

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
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">Cronochip Kit</p>
            <h1 className="text-3xl font-extrabold sm:text-4xl">Central de Entrega</h1>
            <p className="text-muted-foreground truncate text-sm">{event?.name}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="lg" className="h-11 gap-2" onClick={() => setScanOpen(true)}>
              <ScanLine className="size-5" /> Escanear QR Code
            </Button>
          </div>
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

            <section className="mt-8">
              <h2 className="text-lg font-bold mb-3">Resumo do evento</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Kits Entregues" value={stats.delivered} icon={CheckCircle2} color="text-primary" />
                <StatCard label="Atletas Inscritos" value={stats.total} icon={Users} color="text-chart-3" />
                <StatCard label="Kits Restantes" value={stats.pending} icon={Package} color="text-warning" />
                <StatCard label="Taxa de Entrega" value={`${stats.rate}%`} icon={Search} color="text-success" />
              </div>
            </section>
          </>
        )}

        {selected && (
          <Card className="shadow-card overflow-hidden">
            <CardContent className="p-0">
              {(activeDelivery || queuedOffline) && (
                <div className="border-destructive/40 bg-destructive/10 border-b p-4">
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
                    Se a entrega foi feita para o atleta errado, cancele para liberar o kit novamente.
                  </p>
                  {activeDelivery && canCancel && (
                    <Button
                      variant="destructive"
                      className="mt-3"
                      onClick={() => { setCancelReason(""); setCancelOpen(true); }}
                    >
                      <Undo2 className="size-4" /> Cancelar kit entregue
                    </Button>
                  )}
                </div>
              )}

              {asThirdParty && authorization && (
                <div className="border-warning/40 bg-warning/15 border-b p-4">
                  <p className="flex items-center gap-2 text-base font-extrabold">
                    <UserCheck className="size-5" /> RETIRADA POR TERCEIRO
                  </p>
                  <p className="mt-1 text-sm">
                    Autorizado: <strong>{authorization.name}</strong> · CPF {maskCPF(authorization.cpf)}
                  </p>
                </div>
              )}

              <div className="grid gap-6 p-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:p-6">
                <div className="bg-primary/5 flex flex-col items-center justify-center gap-3 rounded-2xl border border-primary/10 p-5">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                    <QrCodePlaceholder value={selected.id} size={120} />
                  </div>
                  <div className="text-center">
                    <p className="text-primary text-4xl font-extrabold leading-none">{selected.bib_number || "—"}</p>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mt-1">Nº de peito</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">Atleta</p>
                      <p className="text-2xl font-extrabold">{selected.name}</p>
                      <p className="text-muted-foreground text-sm">CPF: {maskCPF(selected.cpf)}</p>
                    </div>
                    <Badge
                      className="mt-2 w-fit sm:mt-0"
                      variant={activeDelivery || queuedOffline ? "destructive" : "default"}
                    >
                      {activeDelivery || queuedOffline ? "Entregue" : "Pendente"}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                    <Info label="Tipo de Kit" value={selected.kit_type} />
                    <Info label="Tamanho da Camiseta" value={selected.shirt_size} />
                    <Info label="Modalidade" value={selected.modality} />
                    <Info label="Categoria" value={selected.category} />
                    <Info label="Cidade" value={selected.city} />
                    <Info label="Inscrição" value={selected.registration_number} />
                    {extras.map((f) => (
                      <Info key={f.label} label={f.label} value={f.value} />
                    ))}
                  </dl>
                </div>
              </div>

              {locations.length > 0 && (
                <div className="border-t px-5 py-4 sm:px-6">
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
                </div>
              )}

              {!activeDelivery && !queuedOffline && authorization && !asThirdParty && (
                <div className="border-t px-5 pb-4 sm:px-6">
                  <Button variant="outline" className="w-full" onClick={() => setAsThirdParty(true)}>
                    <UserCheck className="size-4" /> Entregar a terceiro autorizado ({authorization.name})
                  </Button>
                </div>
              )}

              <div className="border-t px-5 py-4 sm:px-6">
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
                        publishDisplay({ status: "idle" });
                      }}
                    >
                      <X className="size-5" /> Voltar
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} onResult={handleScan} />
      </div>
    </AppShell>
  );
}

function QrCodePlaceholder({ value, size = 120 }: { value: string; size?: number }) {
  const url = athleteQrUrl("", value);
  return (
    <div className="rounded-lg">
      <QRCodeSVG value={url} size={size} level="M" includeMargin={false} />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn("bg-muted flex size-11 items-center justify-center rounded-full", color)}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-extrabold leading-tight">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
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
