import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";
import { formatDateTime, logAudit } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/entregas")({
  head: () => ({
    meta: [
      { title: "Entregas — Kit Rápido" },
      { name: "description", content: "Histórico completo de entregas, reentregas e cancelamentos." },
      { property: "og:title", content: "Entregas — Kit Rápido" },
      { property: "og:description", content: "Rastreabilidade de cada kit entregue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Entregas,
});

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

function Entregas() {
  const { event, eventId } = useCurrentEvent();
  const { isAdmin, isOrganizer, profile } = useAuth();
  const canManage = isAdmin || isOrganizer;
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [cancelling, setCancelling] = useState<DeliveryRow | null>(null);
  

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
        .order("delivered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DeliveryRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return deliveries;
    return deliveries.filter(
      (d) =>
        (d.athletes?.name ?? "").toLowerCase().includes(q) ||
        (d.athletes?.bib_number ?? "").includes(q) ||
        (d.delivered_by_name ?? "").toLowerCase().includes(q),
    );
  }, [deliveries, term]);

  async function cancel() {
    if (!cancelling) return;
    const { error } = await supabase
      .from("deliveries")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", cancelling.id);
    if (error) { toast.error("Não foi possível cancelar", { description: error.message }); return; }
    void logAudit({
      eventId,
      action: `Cancelou a entrega de ${cancelling.athletes?.name ?? "atleta"}`,
      entity: "deliveries",
      entityId: cancelling.id,
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries({ queryKey: ["deliveries-full", eventId] });
    await qc.invalidateQueries({ queryKey: ["deliveries", eventId] });
    setCancelling(null);
    toast.success("Entrega cancelada. O atleta voltou para pendente.");
  }

  return (
    <AppShell>
      <PageHeader title="Entregas" subtitle={event?.name ?? ""} />

      <Input
        placeholder="Buscar por atleta, nº de peito ou atendente"
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
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {d.athletes?.name ?? "—"} <span className="text-muted-foreground">nº {d.athletes?.bib_number ?? "—"}</span>
                  </TableCell>
                  <TableCell className="numeric">{formatDateTime(d.delivered_at)}</TableCell>
                  <TableCell className="hidden md:table-cell">{d.delivered_by_name ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {d.delivery_type === "third_party" ? `Terceiro: ${d.third_party_name ?? "—"}` : "Atleta"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.status === "active" ? "default" : "destructive"}>
                      {d.status === "active" ? "Ativa" : "Cancelada"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      {d.status === "active" && (
                        <Button variant="ghost" size="sm" onClick={() => setCancelling(d)}>
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
                    Nenhuma entrega registrada.
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
