import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEvent } from "@/hooks/useEvents";
import { SHIRT_SIZES } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Cronochip Kit" },
      { name: "description", content: "Controle de camisetas por tamanho com baixa automática nas entregas." },
      { property: "og:title", content: "Estoque — Cronochip Kit" },
      { property: "og:description", content: "Saldo por tamanho e alertas de estoque baixo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Estoque,
});

function Estoque() {
  const { event, eventId } = useCurrentEvent();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ size: "M", quantity: "0", threshold: "20" });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("id,size,quantity_initial,quantity_current,low_stock_threshold")
        .eq("event_id", eventId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ordered = [...inventory].sort(
    (a, b) => SHIRT_SIZES.indexOf(a.size as never) - SHIRT_SIZES.indexOf(b.size as never),
  );

  async function save() {
    if (!eventId) return;
    const qty = Number(form.quantity) || 0;
    const { error } = await supabase.from("inventory").upsert(
      {
        event_id: eventId,
        item_type: "camiseta",
        size: form.size,
        quantity_initial: qty,
        quantity_current: qty,
        low_stock_threshold: Number(form.threshold) || 20,
      },
      { onConflict: "event_id,item_type,size" },
    );
    if (error) return toast.error("Não foi possível salvar", { description: error.message });
    await qc.invalidateQueries({ queryKey: ["inventory", eventId] });
    setOpen(false);
    toast.success("Estoque atualizado.");
  }

  async function adjust(id: string, delta: number, current: number) {
    const { error } = await supabase
      .from("inventory")
      .update({ quantity_current: Math.max(current + delta, 0) })
      .eq("id", id);
    if (error) return toast.error("Não foi possível ajustar");
    await qc.invalidateQueries({ queryKey: ["inventory", eventId] });
  }

  return (
    <AppShell>
      <PageHeader
        title="Estoque de camisetas"
        subtitle={event?.name}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Definir tamanho
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((i) => {
          const used = i.quantity_initial - i.quantity_current;
          const percent = i.quantity_initial ? Math.round((used / i.quantity_initial) * 100) : 0;
          const low = i.quantity_current <= i.low_stock_threshold;
          return (
            <Card key={i.id} className={low ? "border-warning/50 shadow-card" : "shadow-card"}>
              <CardContent className="space-y-3 py-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <h2 className="text-2xl font-extrabold">{i.size}</h2>
                  <span className={`numeric text-2xl font-extrabold ${low ? "text-warning" : "text-primary"}`}>
                    {i.quantity_current}
                  </span>
                </div>
                <Progress value={percent} className="h-2" />
                <p className="text-muted-foreground text-xs">
                  {used} entregues de {i.quantity_initial} · alerta em {i.low_stock_threshold}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void adjust(i.id, -1, i.quantity_current)}>
                    -1
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void adjust(i.id, 1, i.quantity_current)}>
                    +1
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {ordered.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum tamanho configurado para este evento.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Definir estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tamanho</Label>
              <div className="flex flex-wrap gap-2">
                {SHIRT_SIZES.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={form.size === s ? "default" : "outline"}
                    onClick={() => setForm({ ...form, size: s })}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade inicial</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Alerta de estoque baixo</Label>
              <Input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void save()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
