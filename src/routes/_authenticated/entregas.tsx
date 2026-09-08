import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";
import { downloadBlob, formatCPF, formatDate, formatDateTime, logAudit } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/entregas")({
  head: () => ({
    meta: [
      { title: "Entregas — Kit Rápido" },
      { name: "description", content: "Filtre kits entregues e pendentes e exporte o resultado em Excel." },
      { property: "og:title", content: "Entregas — Kit Rápido" },
      { property: "og:description", content: "Rastreabilidade de cada kit entregue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Entregas,
});

type AthleteRow = {
  id: string;
  name: string;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  registration_number: string | null;
  bib_number: string | null;
  modality: string | null;
  category: string | null;
  shirt_size: string | null;
  kit_type: string | null;
  registration_status: string | null;
  payment_status: string | null;
  kit_status: string;
  city: string | null;
  equipe: string | null;
  custom_1: string | null;
  custom_2: string | null;
  custom_3: string | null;
  custom_4: string | null;
  custom_5: string | null;
};

type DeliveryRow = {
  id: string;
  athlete_id: string;
  delivered_at: string;
  delivered_by_name: string | null;
  delivery_type: string;
  third_party_name: string | null;
  identification_method: string;
  status: string;
  cancel_reason: string | null;
  athletes: { name: string; bib_number: string | null } | null;
};

type StatusFilter = "delivered" | "pending" | "all";

type KitRow = {
  athlete: AthleteRow;
  delivery: DeliveryRow | null;
  status: "delivered" | "pending" | "blocked";
};

const FILTER_LABEL: Record<StatusFilter, string> = {
  delivered: "Kit entregue",
  pending: "Kit pendente",
  all: "Todos",
};

function Entregas() {
  const { event, eventId } = useCurrentEvent();
  const { isAdmin, isOrganizer, profile } = useAuth();
  const canManage = isAdmin || isOrganizer;
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("delivered");
  const [cancelling, setCancelling] = useState<DeliveryRow | null>(null);

  const { data: athletes = [] } = useQuery({
    queryKey: ["deliveries-athletes", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(
          "id,name,cpf,birth_date,gender,email,phone,registration_number,bib_number,modality,category,shirt_size,kit_type,registration_status,payment_status,kit_status,city,equipe,custom_1,custom_2,custom_3,custom_4,custom_5",
        )
        .eq("event_id", eventId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as AthleteRow[];
    },
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries-full", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select(
          "id,athlete_id,delivered_at,delivered_by_name,delivery_type,third_party_name,identification_method,status,cancel_reason,athletes(name,bib_number)",
        )
        .eq("event_id", eventId!)
        .eq("status", "active")
        .order("delivered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DeliveryRow[];
    },
  });

  const rows = useMemo<KitRow[]>(() => {
    const activeByAthlete = new Map<string, DeliveryRow>();
    for (const delivery of deliveries) {
      if (!activeByAthlete.has(delivery.athlete_id)) activeByAthlete.set(delivery.athlete_id, delivery);
    }
    return athletes.map((athlete) => {
      const delivery = activeByAthlete.get(athlete.id) ?? null;
      const status: KitRow["status"] = delivery
        ? "delivered"
        : athlete.kit_status === "blocked"
          ? "blocked"
          : "pending";
      return { athlete, delivery, status };
    });
  }, [athletes, deliveries]);

  const counts = useMemo(
    () => ({
      delivered: rows.filter((row) => row.status === "delivered").length,
      pending: rows.filter((row) => row.status === "pending").length,
      all: rows.length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "delivered" && row.status !== "delivered") return false;
      if (statusFilter === "pending" && row.status !== "pending") return false;
      if (!q) return true;
      return (
        row.athlete.name.toLowerCase().includes(q) ||
        (row.athlete.bib_number ?? "").includes(q) ||
        (row.delivery?.delivered_by_name ?? "").toLowerCase().includes(q) ||
        (row.delivery?.third_party_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, term]);

  function exportExcel() {
    const labels = event?.custom_field_labels ?? [];
    const data = filtered.map((row) => ({
      Numero: row.athlete.bib_number ?? "",
      Nome: row.athlete.name,
      CPF: formatCPF(row.athlete.cpf),
      Telefone: row.athlete.phone ?? "",
      Email: row.athlete.email ?? "",
      Sexo: row.athlete.gender ?? "",
      "Data de nascimento": row.athlete.birth_date ? formatDate(row.athlete.birth_date) : "",
      Cidade: row.athlete.city ?? "",
      Camisa: row.athlete.shirt_size ?? "",
      Modalidade: row.athlete.modality ?? "",
      Categoria: row.athlete.category ?? "",
      Equipe: row.athlete.equipe ?? "",
      Status: row.athlete.payment_status ?? "",
      "Numero de inscricao": row.athlete.registration_number ?? "",
      Kit: row.athlete.kit_type ?? "",
      "Status inscrição": row.athlete.registration_status ?? "",
      [labels[0] ?? "Campo personalizado 1"]: row.athlete.custom_1 ?? "",
      [labels[1] ?? "Campo personalizado 2"]: row.athlete.custom_2 ?? "",
      [labels[2] ?? "Campo personalizado 3"]: row.athlete.custom_3 ?? "",
      [labels[3] ?? "Campo personalizado 4"]: row.athlete.custom_4 ?? "",
      [labels[4] ?? "Campo personalizado 5"]: row.athlete.custom_5 ?? "",
      "Status do kit":
        row.status === "delivered"
          ? row.delivery?.delivery_type === "third_party"
            ? "Kit entregue - terceiro"
            : "Kit entregue"
          : row.status === "blocked"
            ? "Bloqueado"
            : "Kit pendente",
      "Data/hora da entrega": row.delivery ? formatDateTime(row.delivery.delivered_at) : "",
      Atendente: row.delivery?.delivered_by_name ?? "",
      "Retirado por":
        row.delivery?.delivery_type === "third_party" ? row.delivery.third_party_name ?? "" : row.delivery ? "Atleta" : "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Kits");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    downloadBlob(
      out,
      `kits-${statusFilter}-${event?.slug ?? "evento"}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    toast.success("Excel gerado com o filtro selecionado.");
  }

  async function cancel() {
    if (!cancelling) return;
    const { error } = await supabase
      .from("deliveries")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", cancelling.id);
    if (error) {
      toast.error("Não foi possível cancelar", { description: error.message });
      return;
    }
    void logAudit({
      eventId,
      action: `Cancelou a entrega de ${cancelling.athletes?.name ?? "atleta"}`,
      entity: "deliveries",
      entityId: cancelling.id,
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries({ queryKey: ["deliveries-full", eventId] });
    await qc.invalidateQueries({ queryKey: ["deliveries-athletes", eventId] });
    await qc.invalidateQueries({ queryKey: ["deliveries", eventId] });
    await qc.invalidateQueries({ queryKey: ["athletes", eventId] });
    setCancelling(null);
    toast.success("Entrega cancelada. O atleta voltou para pendente.");
  }

  return (
    <AppShell>
      <PageHeader title="Entregas" subtitle={event?.name ?? ""} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABEL) as StatusFilter[]).map((filter) => (
            <Button
              key={filter}
              type="button"
              variant={statusFilter === filter ? "default" : "outline"}
              onClick={() => setStatusFilter(filter)}
            >
              {FILTER_LABEL[filter]}
              <Badge variant="secondary" className="ml-1">
                {counts[filter]}
              </Badge>
            </Button>
          ))}
        </div>
        <Button type="button" variant="outline" disabled={!filtered.length} onClick={exportExcel}>
          <FileSpreadsheet className="size-4" /> Exportar Excel
        </Button>
      </div>

      <Input
        placeholder="Buscar por atleta, nº de peito, atendente ou terceiro"
        className="mb-4 h-12"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atleta</TableHead>
                <TableHead>Data/hora</TableHead>
                <TableHead className="hidden md:table-cell">Atendente</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.athlete.id}>
                  <TableCell className="max-w-[220px] truncate font-medium">
                    {row.athlete.name} <span className="text-muted-foreground">nº {row.athlete.bib_number ?? "—"}</span>
                  </TableCell>
                  <TableCell className="numeric">
                    {row.delivery ? formatDateTime(row.delivery.delivered_at) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{row.delivery?.delivered_by_name ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {row.delivery?.delivery_type === "third_party"
                      ? `Terceiro: ${row.delivery.third_party_name ?? "—"}`
                      : row.delivery
                        ? "Atleta"
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "delivered" ? "default" : row.status === "blocked" ? "destructive" : "secondary"
                      }
                    >
                      {row.status === "delivered" ? "Kit entregue" : row.status === "blocked" ? "Bloqueado" : "Kit pendente"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      {row.delivery && (
                        <Button variant="ghost" size="sm" onClick={() => setCancelling(row.delivery)}>
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Nenhum registro encontrado para o filtro selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!cancelling} onOpenChange={(v) => !v && setCancelling(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar entrega e liberar reentrega</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>Voltar</Button>
            <Button variant="destructive" onClick={() => void cancel()}>
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
