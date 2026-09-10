import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shirt } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEvent } from "@/hooks/useEvents";
import { SHIRT_SIZES } from "@/lib/fetch-all";
import { fetchAllRows } from "@/lib/x-placeholder";cronochip";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Kit Rápido" },
      {
        name: "description",
        content: "Contagem de camisetas por tamanho a partir dos atletas inscritos, com entregues e pendentes.",
      },
      { property: "og:title", content: "Estoque — Kit Rápido" },
      { property: "og:description", content: "Total, entregues e a entregar por tamanho de camiseta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Estoque,
});

type Row = {
  shirt_size: string | null;
  kit_status: string;
  modality: string | null;
  kit_type: string | null;
  equipe: string | null;
};

const ALL = "__all__";

function sizeOrder(a: string, b: string) {
  const ia = SHIRT_SIZES.indexOf(a as never);
  const ib = SHIRT_SIZES.indexOf(b as never);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

function Estoque() {
  const { event, eventId } = useCurrentEvent();
  const [modality, setModality] = useState(ALL);
  const [kitType, setKitType] = useState(ALL);

  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ["inventory-athletes", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const data = await fetchAllRows<Row>(() =>
        supabase
          .from("athletes")
          .select("shirt_size,kit_status,modality,kit_type,equipe")
          .eq("event_id", eventId!),
      );
      return data;
    },
  });

  const modalities = useMemo(
    () => [...new Set(athletes.map((a) => (a.modality ?? "").trim()).filter(Boolean))].sort(),
    [athletes],
  );
  const kitTypes = useMemo(
    () => [...new Set(athletes.map((a) => (a.kit_type ?? "").trim()).filter(Boolean))].sort(),
    [athletes],
  );

  const filtered = athletes.filter(
    (a) =>
      (modality === ALL || (a.modality ?? "").trim() === modality) &&
      (kitType === ALL || (a.kit_type ?? "").trim() === kitType),
  );

  const groups = useMemo(() => {
    const map = new Map<string, { size: string; total: number; delivered: number }>();
    for (const a of filtered) {
      const size = (a.shirt_size ?? "").trim().toUpperCase() || "Sem tamanho";
      const g = map.get(size) ?? { size, total: 0, delivered: 0 };
      g.total += 1;
      if (a.kit_status === "delivered" || a.kit_status === "third_party") g.delivered += 1;
      map.set(size, g);
    }
    return [...map.values()].sort((a, b) => sizeOrder(a.size, b.size));
  }, [filtered]);

  const total = filtered.length;
  const delivered = groups.reduce((s, g) => s + g.delivered, 0);
  const pending = total - delivered;

  return (
    <AppShell>
      <PageHeader
        title="Estoque de camisetas"
        subtitle={event?.name ?? ""}
      />

      <p className="text-muted-foreground -mt-2 mb-4 text-sm">
        A contagem é feita automaticamente pelo tamanho informado na planilha ou no cadastro de cada atleta.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:max-w-xl">
        <div className="space-y-1.5">
          <Label>Modalidade</Label>
          <Select value={modality} onValueChange={setModality}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {modalities.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de kit</Label>
          <Select value={kitType} onValueChange={setKitType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {kitTypes.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Summary label="Quantidade total" value={total} />
        <Summary label="Entregues" value={delivered} tone="text-success" />
        <Summary label="A entregar" value={pending} tone="text-warning" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => {
          const remaining = g.total - g.delivered;
          const percent = g.total ? Math.round((g.delivered / g.total) * 100) : 0;
          return (
            <Card key={g.size} className="shadow-card">
              <CardContent className="space-y-3 py-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <h2 className="flex items-center gap-2 text-2xl font-extrabold">
                    <Shirt className="text-muted-foreground size-5" /> {g.size}
                  </h2>
                  <span className="numeric text-primary text-2xl font-extrabold">{g.total}</span>
                </div>
                <Progress value={percent} className="h-2" />
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <Stat label="Total" value={g.total} />
                  <Stat label="Entregues" value={g.delivered} tone="text-success" />
                  <Stat label="A entregar" value={remaining} tone="text-warning" />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {groups.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Carregando…" : "Nenhum atleta encontrado com os filtros selecionados."}
          </p>
        )}
      </div>
    </AppShell>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="py-4">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
        <p className={`numeric text-3xl font-extrabold ${tone ?? "text-primary"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <p className="text-muted-foreground uppercase">{label}</p>
      <p className={`numeric text-lg font-bold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
