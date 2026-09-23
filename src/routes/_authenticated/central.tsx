import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ListChecks,
  MonitorSmartphone,
  Package,
  ScanLine,
  Search,
  Undo2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QrScanDialog } from "@/components/QrScanDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { fetchAllRows } from "@/lib/fetch-all";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";
import {
  athleteQrUrl,
  formatDate,
  formatDateTime,
  formatTime,
  isUnder18,
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
      { title: "Central de Entrega — Kit Rápido" },
      { name: "description", content: "Leia o QR Code ou pesquise o atleta e registre a entrega do kit." },
      { property: "og:title", content: "Central de Entrega — Kit Rápido" },
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
  birth_date: string | null;
  gender: string | null;
  registration_number: string | null;
  bib_number: string | null;
  modality: string | null;
  category: string | null;
  city: string | null;
  equipe: string | null;
  shirt_size: string | null;
  kit_type: string | null;
  kit_status: string;
  payment_status: string;
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
  third_party_name: string | null;
  location_id: string | null;
  status: string;
};

function isPaid(a: Athlete) {
  const s = (a.payment_status || "").toLowerCase().trim();
  return s === "pago" || s === "paid";
}

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function PaymentBadge({ athlete, big = false }: { athlete: Athlete; big?: boolean }) {
  const paid = isPaid(athlete);
  return (
    <Badge
      className={cn(
        "font-bold uppercase",
        paid
          ? "border-success/30 bg-success/15 text-success"
          : "border-destructive/30 bg-destructive/15 text-destructive",
        big ? "text-base" : "text-xs",
      )}
    >
      {paid ? "PAGO" : "PENDENTE"}
    </Badge>
  );
}

function Central() {
  const { event, eventId } = useCurrentEvent();
  const { user, profile, isAdmin, isOrganizer, isAttendant } = useAuth();
  const qc = useQueryClient();

  const [term, setTerm] = useState("");
  const [teamOnly, setTeamOnly] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [method, setMethod] = useState<"qrcode" | "busca">("busca");
  const [confirming, setConfirming] = useState(false);
  const [asThirdParty, setAsThirdParty] = useState(false);
  const [manualThird, setManualThird] = useState<{ name: string; cpf: string } | null>(null);
  const [thirdOpen, setThirdOpen] = useState(false);
  const [thirdName, setThirdName] = useState("");
  const [thirdCpf, setThirdCpf] = useState("");
  const [success, setSuccess] = useState<{ name: string; bib: string | null; at: string } | null>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelections, setBulkSelections] = useState<Record<string, "qrcode" | "busca">>({});
  const [bulkResponsibleName, setBulkResponsibleName] = useState("");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ delivered: number; failed: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: athletes = [] } = useQuery({
    queryKey: ["athletes", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const data = await fetchAllRows<Athlete>(() =>
        supabase
          .from("athletes")
          .select(
            "id,event_id,name,cpf,birth_date,gender,registration_number,bib_number,modality,category,city,equipe,shirt_size,kit_type,kit_status,payment_status,custom_1,custom_2,custom_3,custom_4,custom_5",
          )
          .eq("event_id", eventId!)
          .order("name"),
      );
      cacheAthletes(eventId!, data);
      return data;
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
        .select("id,athlete_id,delivered_at,delivered_by_name,delivery_type,third_party_name,location_id,status")
        .eq("event_id", eventId!)
        .order("delivered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Delivery[];
    },
  });

  const { data: staffCanCancel = false } = useQuery({
    queryKey: ["delivery-cancel-permission", eventId, user?.id],
    enabled: !!eventId && !!user?.id && isAttendant,
    queryFn: async () => {
      if (!eventId || !user) return false;
      const { data, error } = await supabase
        .from("event_members")
        .select("can_cancel_deliveries")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .eq("role", "attendant")
        .maybeSingle();
      if (error) throw error;
      return data?.can_cancel_deliveries ?? false;
    },
  });
  const canCancel = isAdmin || isOrganizer || staffCanCancel;

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
    const q = normalizeSearch(term.trim());
    if (q.length < 2) return [];
    const digits = onlyDigits(q);
    return roster
      .filter((a) => {
        if (teamOnly) {
          return normalizeSearch(a.equipe).includes(q);
        }
        return (
          normalizeSearch(a.name).includes(q) ||
          normalizeSearch(a.bib_number).includes(q) ||
          normalizeSearch(a.registration_number).includes(q) ||
          (digits.length >= 3 && onlyDigits(a.cpf).includes(digits))
        );
      })
      .slice(0, 25);
  }, [term, roster, teamOnly]);

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

  const activeDeliveryIds = useMemo(
    () => new Set(deliveries.filter((d) => d.status === "active").map((d) => d.athlete_id)),
    [deliveries],
  );

  const activeThirdPartyDeliveries = useMemo(
    () =>
      new Map(
        deliveries
          .filter(
            (delivery) =>
              delivery.status === "active" &&
              delivery.delivery_type === "third_party" &&
              Boolean(delivery.third_party_name?.trim()),
          )
          .map((delivery) => [delivery.athlete_id, delivery.third_party_name?.trim() ?? ""]),
      ),
    [deliveries],
  );

  const bulkAthletes = useMemo(
    () => roster.filter((athlete) => bulkSelections[athlete.id]),
    [roster, bulkSelections],
  );

  function addBulkAthlete(athlete: Athlete, identificationMethod: "qrcode" | "busca") {
    if (activeDeliveryIds.has(athlete.id) || isQueuedAthlete(athlete.id) || athlete.kit_status !== "pending") {
      toast.error(`O kit de ${athlete.name} já foi entregue.`);
      return;
    }
    if (bulkSelections[athlete.id]) {
      toast.info(`${athlete.name} já está na lista.`);
      return;
    }
    setBulkSelections((current) => ({ ...current, [athlete.id]: identificationMethod }));
    setTerm("");
    toast.success(`${athlete.name} adicionado à retirada.`);
  }

  function removeBulkAthlete(athleteId: string) {
    setBulkSelections((current) => {
      const next = { ...current };
      delete next[athleteId];
      return next;
    });
  }

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
      if (bulkMode) {
        addBulkAthlete(found, "qrcode");
        return;
      }
      setAsThirdParty(false);
      setSelected(found);
      return;
    }
    const auth = authorizations.find((a) => a.qr_code === parsed.code);
    if (!auth) { toast.error("Autorização inválida ou cancelada."); return; }
    const found = roster.find((a) => a.id === auth.athlete_id);
    if (!found) { toast.error("Atleta da autorização não encontrado."); return; }
    if (bulkMode) {
      addBulkAthlete(found, "qrcode");
      return;
    }
    setAsThirdParty(true);
    setSelected(found);
  }

  async function confirmBulkDelivery() {
    if (!eventId || bulkAthletes.length === 0 || bulkResponsibleName.trim().length < 3) return;
    setBulkSubmitting(true);
    const responsibleName = bulkResponsibleName.trim();
    let delivered = 0;
    let failed = 0;

    for (const athlete of bulkAthletes) {
      const payload = {
        event_id: eventId,
        athlete_id: athlete.id,
        kit_name: athlete.kit_type,
        shirt_size: athlete.shirt_size,
        location_id: locationId || null,
        delivered_by: user?.id ?? null,
        delivered_by_name: profile?.name || profile?.email || null,
        delivery_type: "third_party" as const,
        third_party_name: responsibleName,
        third_party_cpf: null,
        identification_method: bulkSelections[athlete.id] ?? "busca",
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueDelivery({
          ...payload,
          localId: crypto.randomUUID(),
          athlete_name: athlete.name,
          bib_number: athlete.bib_number,
          kit_id: null,
          delivered_at: new Date().toISOString(),
        });
        delivered += 1;
        continue;
      }

      const { error } = await supabase.from("deliveries").insert(payload);
      if (error) {
        failed += 1;
        continue;
      }
      delivered += 1;
      void logAudit({
        eventId,
        action: `Entrega múltipla de kit para ${athlete.name} (nº ${athlete.bib_number ?? "—"}); responsável: ${responsibleName}`,
        entity: "deliveries",
        entityId: athlete.id,
        newData: payload,
        userName: profile?.name ?? null,
      });
    }

    await Promise.all([
      qc.invalidateQueries({ queryKey: ["deliveries", eventId] }),
      qc.invalidateQueries({ queryKey: ["athletes", eventId] }),
      qc.invalidateQueries({ queryKey: ["inventory", eventId] }),
    ]);
    setBulkSubmitting(false);
    setBulkConfirmOpen(false);
    setBulkSelections({});
    setBulkResponsibleName("");
    setBulkResult({ delivered, failed });
    if (failed > 0) {
      toast.warning(`${delivered} kit(s) entregue(s) e ${failed} não registrado(s).`);
    } else if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.warning(`${delivered} entrega(s) salvas offline para sincronização.`);
    } else {
      toast.success(`${delivered} kits entregues com sucesso.`);
    }
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
      delivery_type: (asThirdParty || manualThird ? "third_party" : "athlete") as "third_party" | "athlete",
      third_party_name: manualThird ? manualThird.name : asThirdParty ? (authorization?.name ?? null) : null,
      third_party_cpf: manualThird ? (manualThird.cpf || null) : asThirdParty ? (authorization?.cpf ?? null) : null,
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
    if (!activeDelivery || !selected || !canCancel) return;
    setCancelling(true);
    const { error } = await supabase
      .from("deliveries")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user?.id ?? null,
      })
      .eq("id", activeDelivery.id);
    setCancelling(false);
    if (error) { toast.error("Não foi possível cancelar", { description: error.message }); return; }
    void logAudit({
      eventId,
      action: `Cancelou a entrega de ${selected.name} (nº ${selected.bib_number ?? "—"})`,
      entity: "deliveries",
      entityId: activeDelivery.id,
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries({ queryKey: ["deliveries", eventId] });
    await qc.invalidateQueries({ queryKey: ["athletes", eventId] });
    await qc.invalidateQueries({ queryKey: ["inventory", eventId] });
    setCancelOpen(false);
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
    setManualThird(null);
    setThirdName("");
    setThirdCpf("");
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

  if (bulkResult) {
    return (
      <AppShell>
        <div className="bg-success/12 border-success/30 flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-2xl border p-8 text-center">
          <CheckCircle2 className="text-success size-20" />
          <h1 className="text-success text-3xl font-extrabold">RETIRADA CONCLUÍDA</h1>
          <p className="text-2xl font-bold">{bulkResult.delivered} KITS ENTREGUES</p>
          {bulkResult.failed > 0 && (
            <p className="text-destructive font-semibold">{bulkResult.failed} kits não foram registrados.</p>
          )}
          <Button className="mt-4" size="lg" onClick={() => setBulkResult(null)}>
            Nova retirada
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
            <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">Kit Rápido</p>
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
                placeholder={teamOnly ? "Digite o nome da equipe" : "Nome, CPF, inscrição ou nº de peito"}
                className="h-14 pl-11 text-base"
                autoComplete="off"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Checkbox
                id="team-only"
                checked={teamOnly}
                onCheckedChange={(checked) => {
                  setTeamOnly(checked === true);
                  setTerm("");
                }}
              />
              <Label htmlFor="team-only" className="cursor-pointer text-sm font-medium">
                Pesquisar somente por equipe
              </Label>
            </div>
            <div className="border-primary/20 bg-primary/5 mt-3 flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                id="bulk-mode"
                className="mt-0.5 size-5"
                checked={bulkMode}
                onCheckedChange={(checked) => {
                  const enabled = checked === true;
                  setBulkMode(enabled);
                  setBulkSelections({});
                  setBulkResponsibleName("");
                  setTerm("");
                }}
              />
              <div>
                <Label htmlFor="bulk-mode" className="cursor-pointer font-bold">
                  Retirada de vários kits
                </Label>
                <p className="text-muted-foreground text-xs">Selecione atletas por busca ou QR Code.</p>
              </div>
            </div>

            {results.length > 0 && (
              <div className="mt-3 space-y-2">
                {results.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      if (bulkMode) {
                        if (bulkSelections[a.id]) removeBulkAthlete(a.id);
                        else addBulkAthlete(a, "busca");
                        return;
                      }
                      setSelected(a);
                      setMethod("busca");
                    }}
                    className="bg-card hover:border-primary grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <p className="truncate font-semibold">{a.name}</p>
                        {isUnder18(a.birth_date) && (
                          <Badge className="border-warning/30 bg-warning/15 text-warning shrink-0 text-[10px] font-bold uppercase">
                            Menor de 18 anos
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        Nº {a.bib_number ?? "—"} · {a.modality ?? "—"} · {maskCPF(a.cpf)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {bulkMode && (
                        <Checkbox
                          checked={!!bulkSelections[a.id]}
                          disabled={activeDeliveryIds.has(a.id) || isQueuedAthlete(a.id) || a.kit_status !== "pending"}
                          className="pointer-events-none size-5"
                        />
                      )}
                      <div className="flex flex-col items-end gap-1">
                      <PaymentBadge athlete={a} />
                      <Badge
                        className={cn(
                          "font-bold uppercase",
                          a.kit_status === "pending"
                            ? "border-warning/30 bg-warning/15 text-warning"
                            : "border-success/30 bg-success/15 text-success",
                        )}
                      >
                        {a.kit_status === "pending" ? "KIT PENDENTE" : "KIT ENTREGUE"}
                      </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {bulkMode && (
              <section className="mt-5 border-y py-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <ListChecks className="text-primary size-5" /> Kits selecionados
                  </h2>
                  <Badge variant="secondary">{bulkAthletes.length}</Badge>
                </div>
                {bulkAthletes.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    Pesquise ou leia o QR Code dos atletas que deseja adicionar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {bulkAthletes.map((athlete) => (
                      <div key={athlete.id} className="bg-card flex items-center gap-3 rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{athlete.name}</p>
                          <p className="text-muted-foreground text-xs">
                            Nº {athlete.bib_number ?? "—"} · {athlete.shirt_size ?? "Sem camiseta"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Remover ${athlete.name}`}
                          onClick={() => removeBulkAthlete(athlete.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {locations.length > 0 && bulkAthletes.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <Label>Local de retirada</Label>
                    <Select value={locationId} onValueChange={setLocationId}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione o local" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  size="lg"
                  className="mt-4 h-14 w-full"
                  disabled={bulkAthletes.length === 0}
                  onClick={() => setBulkConfirmOpen(true)}
                >
                  Confirmar retirada de {bulkAthletes.length} kit(s)
                </Button>
              </section>
            )}

            {!bulkMode && <section className="mt-8">
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
            </section>}

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
                        {activeDelivery.delivery_type === "third_party" && activeDelivery.third_party_name && (
                          <p>
                            Retirado por: <strong>{activeDelivery.third_party_name}</strong>
                          </p>
                        )}
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
                      onClick={() => setCancelOpen(true)}
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
                    <p className="text-primary text-7xl font-extrabold leading-none">{selected.bib_number || "—"}</p>
                    <p className="text-muted-foreground text-sm uppercase tracking-wide mt-2">Número</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">Atleta</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-2xl font-extrabold">{selected.name}</p>
                        {isUnder18(selected.birth_date) && (
                          <Badge className="border-warning/30 bg-warning/15 text-warning font-bold uppercase">
                            <AlertTriangle className="size-3.5" /> Menor de 18 anos
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">CPF: {maskCPF(selected.cpf)}</p>
                      <div className="mt-1">
                        <PaymentBadge athlete={selected} />
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "mt-2 w-fit font-bold uppercase sm:mt-0",
                        activeDelivery || queuedOffline
                          ? "border-success/30 bg-success/15 text-success"
                          : "border-warning/30 bg-warning/15 text-warning",
                      )}
                    >
                      {activeDelivery || queuedOffline ? "KIT ENTREGUE" : "KIT PENDENTE"}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                    <Info label="Data de Nascimento" value={formatDate(selected.birth_date)} />
                    <Info label="Sexo" value={selected.gender} />
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

              {!activeDelivery && !queuedOffline && (
                <div className="border-t px-5 py-4 sm:px-6">
                  <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-3">
                    <Checkbox
                      id="terceiros"
                      className="mt-0.5 size-5"
                      checked={!!manualThird}
                      onCheckedChange={(v) => {
                        if (v) {
                          setThirdName(manualThird?.name ?? "");
                          setThirdCpf(manualThird?.cpf ?? "");
                          setThirdOpen(true);
                        } else {
                          setManualThird(null);
                        }
                      }}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="terceiros" className="font-bold uppercase">
                        Retirado por terceiros
                      </Label>
                      {manualThird && (
                        <p className="text-muted-foreground text-sm">
                          {manualThird.name}
                          {manualThird.cpf ? ` · CPF ${maskCPF(manualThird.cpf)}` : ""}{" "}
                          <button
                            type="button"
                            className="text-primary underline cursor-pointer"
                            onClick={() => {
                              setThirdName(manualThird.name);
                              setThirdCpf(manualThird.cpf);
                              setThirdOpen(true);
                            }}
                          >
                            alterar
                          </button>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t px-5 py-4 sm:px-6">
                {confirming ? (
                  <div className="bg-muted space-y-3 rounded-xl p-4">
                    <p className="text-center font-semibold">
                      Confirme a entrega do kit para este atleta.
                      {manualThird ? ` Retirada por terceiros: ${manualThird.name}.` : ""}
                    </p>

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

        <Dialog open={bulkConfirmOpen} onOpenChange={(open) => !bulkSubmitting && setBulkConfirmOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar retirada de vários kits</DialogTitle>
              <DialogDescription>
                Informe somente o nome da pessoa que está retirando os {bulkAthletes.length} kits.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-responsible">Nome do responsável pela retirada</Label>
                <Input
                  id="bulk-responsible"
                  value={bulkResponsibleName}
                  onChange={(event) => setBulkResponsibleName(event.target.value)}
                  placeholder="Nome completo"
                  autoComplete="name"
                />
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-bold">{bulkAthletes.length} kits serão entregues</p>
                <p className="text-muted-foreground mt-1 line-clamp-3">
                  {bulkAthletes.map((athlete) => athlete.name).join(", ")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={bulkSubmitting} onClick={() => setBulkConfirmOpen(false)}>
                Voltar
              </Button>
              <Button
                disabled={bulkSubmitting || bulkResponsibleName.trim().length < 3}
                onClick={() => void confirmBulkDelivery()}
              >
                {bulkSubmitting ? "Registrando..." : "Confirmar todas as entregas"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={thirdOpen}
          onOpenChange={(v) => {
            if (!v) {
              setThirdOpen(false);
              if (!manualThird) {
                setThirdName("");
                setThirdCpf("");
              }
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Retirado por terceiros</DialogTitle>
              <DialogDescription>
                Informe quem está retirando o kit de <strong>{selected?.name}</strong>. O nome fica
                registrado no relatório de retirada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="third-name">Nome de quem retirou</Label>
                <Input
                  id="third-name"
                  value={thirdName}
                  onChange={(e) => setThirdName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="third-cpf">CPF (opcional)</Label>
                <Input
                  id="third-cpf"
                  inputMode="numeric"
                  value={thirdCpf}
                  onChange={(e) => setThirdCpf(onlyDigits(e.target.value).slice(0, 11))}
                  placeholder="Somente números"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setThirdOpen(false);
                  if (!manualThird) {
                    setThirdName("");
                    setThirdCpf("");
                  }
                }}
              >
                Cancelar
              </Button>
              <Button
                disabled={thirdName.trim().length < 3}
                onClick={() => {
                  setManualThird({ name: thirdName.trim(), cpf: thirdCpf });
                  setThirdOpen(false);
                }}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={cancelOpen} onOpenChange={(v) => !v && setCancelOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar kit entregue</DialogTitle>
              <DialogDescription>
                A entrega de <strong>{selected?.name}</strong> será cancelada e o atleta voltará a
                constar como pendente. O estoque será estornado automaticamente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
              <Button variant="destructive" disabled={cancelling} onClick={() => void cancelDelivery()}>
                {cancelling ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
