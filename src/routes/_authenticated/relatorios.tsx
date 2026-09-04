import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEvent } from "@/hooks/useEvents";
import { KIT_STATUS, downloadBlob, formatDateTime, maskCPF } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Cronochip Kit" },
      { name: "description", content: "Exporte entregas, pendentes e estoque em PDF, Excel ou CSV." },
      { property: "og:title", content: "Relatórios — Cronochip Kit" },
      { property: "og:description", content: "Relatórios completos da operação de entrega de kits." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Relatorios,
});

type Row = Record<string, string | number | null>;

function Relatorios() {
  const { event, eventId } = useCurrentEvent();

  const { data } = useQuery({
    queryKey: ["reports", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const [athletes, deliveries, inventory] = await Promise.all([
        supabase
          .from("athletes")
          .select("id,name,cpf,bib_number,modality,shirt_size,kit_status")
          .eq("event_id", eventId!)
          .order("name"),
        supabase
          .from("deliveries")
          .select("delivered_at,delivered_by_name,delivery_type,third_party_name,status,athletes(name,bib_number,shirt_size)")
          .eq("event_id", eventId!)
          .order("delivered_at", { ascending: false }),
        supabase
          .from("inventory")
          .select("size,quantity_initial,quantity_current")
          .eq("event_id", eventId!),
      ]);
      return {
        athletes: athletes.data ?? [],
        deliveries: (deliveries.data ?? []) as unknown as {
          delivered_at: string;
          delivered_by_name: string | null;
          delivery_type: string;
          third_party_name: string | null;
          status: string;
          athletes: { name: string; bib_number: string | null; shirt_size: string | null } | null;
        }[],
        inventory: inventory.data ?? [],
      };
    },
  });

  const reports: { key: string; title: string; description: string; rows: () => Row[] }[] = [
    {
      key: "entregues",
      title: "Kits entregues",
      description: "Todas as entregas ativas com atendente, horário e tipo de retirada.",
      rows: () =>
        (data?.deliveries ?? [])
          .filter((d) => d.status === "active")
          .map((d) => ({
            Atleta: d.athletes?.name ?? "",
            Peito: d.athletes?.bib_number ?? "",
            Camiseta: d.athletes?.shirt_size ?? "",
            "Data/hora": formatDateTime(d.delivered_at),
            Atendente: d.delivered_by_name ?? "",
            Retirada: d.delivery_type === "third_party" ? `Terceiro: ${d.third_party_name ?? ""}` : "Atleta",
          })),
    },
    {
      key: "pendentes",
      title: "Kits pendentes",
      description: "Atletas que ainda não retiraram o kit.",
      rows: () =>
        (data?.athletes ?? [])
          .filter((a) => a.kit_status === "pending")
          .map((a) => ({
            Atleta: a.name,
            CPF: maskCPF(a.cpf),
            Peito: a.bib_number ?? "",
            Modalidade: a.modality ?? "",
            Camiseta: a.shirt_size ?? "",
          })),
    },
    {
      key: "estoque",
      title: "Estoque de camisetas",
      description: "Saldo atual e consumo por tamanho.",
      rows: () =>
        (data?.inventory ?? []).map((i) => ({
          Tamanho: i.size,
          Inicial: i.quantity_initial,
          Entregues: i.quantity_initial - i.quantity_current,
          Saldo: i.quantity_current,
        })),
    },
    {
      key: "geral",
      title: "Lista geral de atletas",
      description: "Base completa de inscritos com o status de cada kit.",
      rows: () =>
        (data?.athletes ?? []).map((a) => ({
          Atleta: a.name,
          CPF: maskCPF(a.cpf),
          Peito: a.bib_number ?? "",
          Modalidade: a.modality ?? "",
          Camiseta: a.shirt_size ?? "",
          Status: KIT_STATUS[a.kit_status] ?? a.kit_status,
        })),
    },
  ];

  const base = event?.slug ?? "evento";

  function csv(rows: Row[], name: string) {
    downloadBlob("\uFEFF" + Papa.unparse(rows), `${name}-${base}.csv`, "text/csv;charset=utf-8");
  }

  function excel(rows: Row[], name: string) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Relatorio");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    downloadBlob(out, `${name}-${base}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }

  function pdf(rows: Row[], title: string) {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`${title} — ${event?.name ?? ""}`, 14, 14);
    doc.setFontSize(9);
    doc.text(`Gerado em ${formatDateTime(new Date().toISOString())} · Cronochip Kit`, 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [Object.keys(rows[0] ?? { Vazio: "" })],
      body: rows.map((r) => Object.values(r).map((v) => String(v ?? ""))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 138, 73] },
    });
    doc.save(`${title}-${base}.pdf`);
  }

  return (
    <AppShell>
      <PageHeader title="Relatórios" subtitle={event?.name} />

      <div className="grid gap-3 md:grid-cols-2">
        {reports.map((r) => {
          const rows = r.rows();
          return (
            <Card key={r.key} className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">{r.description}</p>
                <p className="numeric text-2xl font-extrabold">{rows.length}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => pdf(rows, r.title)}>
                    <FileText className="size-4" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => excel(rows, r.key)}>
                    <FileSpreadsheet className="size-4" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => csv(rows, r.key)}>
                    <Table2 className="size-4" /> CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
