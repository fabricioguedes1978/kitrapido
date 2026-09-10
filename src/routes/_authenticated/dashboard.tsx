import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Boxes, PackageCheck, Timer, Users } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEvent } from "@/hooks/useEvents";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Kit Rápido" },
      { name: "description", content: "Acompanhe em tempo real a entrega de kits do seu evento." },
      { property: "og:title", content: "Dashboard — Kit Rápido" },
      { property: "og:description", content: "Indicadores de retirada, estoque e ritmo de entrega." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function Dashboard() {
  const { event, eventId } = useCurrentEvent();

  const { data } = useQuery({
    queryKey: ["dashboard", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const [athletes, deliveries, inventory] = await Promise.all([
        fetchAllRows<{ id: string; kit_status: string | null; shirt_size: string | null; modality: string | null }>(() =>
          supabase.from("athletes").select("id,kit_status,shirt_size,modality").eq("event_id", eventId!),
        ),
        fetchAllRows<{ id: string; delivered_at: string; status: string; delivery_type: string }>(() =>
          supabase
            .from("deliveries")
            .select("id,delivered_at,status,delivery_type")
            .eq("event_id", eventId!)
            .eq("status", "active"),
        ),
        supabase.from("inventory").select("size,quantity_initial,quantity_current,low_stock_threshold").eq("event_id", eventId!),
      ]);
      return {
        athletes,
        deliveries,
        inventory: inventory.data ?? [],
      };
    },
  });

  const athletes = data?.athletes ?? [];
  const deliveries = data?.deliveries ?? [];
  const inventory = data?.inventory ?? [];

  const total = athletes.length;
  const delivered = deliveries.length;
  const pending = Math.max(total - delivered, 0);
  const percent = total ? Math.round((delivered / total) * 100) : 0;
  const thirdParty = deliveries.filter((d) => d.delivery_type === "third_party").length;

  const byHour = (() => {
    const map = new Map<string, number>();
    deliveries.forEach((d) => {
      const h = new Date(d.delivered_at).getHours().toString().padStart(2, "0") + "h";
      map.set(h, (map.get(h) ?? 0) + 1);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([hora, entregas]) => ({ hora, entregas }));
  })();

  const lastHour = deliveries.filter((d) => Date.now() - new Date(d.delivered_at).getTime() < 3600_000).length;

  const bySize = inventory.map((i) => ({ name: i.size, value: i.quantity_initial - i.quantity_current }));
  const lowStock = inventory.filter((i) => i.quantity_current <= i.low_stock_threshold);

  return (
    <AppShell>
      <PageHeader title="Dashboard" subtitle={event?.name ?? "Selecione um evento"} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Inscritos" value={total} />
        <Stat icon={PackageCheck} label="Kits entregues" value={delivered} accent />
        <Stat icon={Boxes} label="Pendentes" value={pending} />
        <Stat icon={Timer} label="Entregas na última hora" value={lastHour} />
      </div>

      <Card className="shadow-card mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progresso da entrega</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <span className="numeric text-4xl font-extrabold">{percent}%</span>
            <span className="text-muted-foreground text-sm">
              {delivered} de {total} · {thirdParty} por terceiros
            </span>
          </div>
          <Progress value={percent} className="mt-3 h-3" />
        </CardContent>
      </Card>

      {lowStock.length > 0 && (
        <Card className="border-warning/40 bg-warning/10 mt-4">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 text-sm">
              <p className="font-bold">Estoque baixo</p>
              <p className="text-muted-foreground">
                {lowStock.map((i) => `${i.size} (${i.quantity_current})`).join(" · ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Entregas por horário</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="hora" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="entregas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Camisetas entregues por tamanho</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bySize} dataKey="value" nameKey="name" outerRadius={90} label>
                  {bySize.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/40 shadow-brand" : "shadow-card"}>
      <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-5">
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs tracking-wide uppercase">{label}</p>
          <p className="numeric text-3xl font-extrabold">{value}</p>
        </div>
        <Icon className={`size-8 shrink-0 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </CardContent>
    </Card>
  );
}
