import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEvent } from "@/hooks/useEvents";
import { formatDate } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/locais")({
  head: () => ({
    meta: [
      { title: "Locais de Retirada — Cronochip Kit" },
      { name: "description", content: "Cadastre pontos, datas e horários de retirada dos kits." },
      { property: "og:title", content: "Locais de Retirada — Cronochip Kit" },
      { property: "og:description", content: "Pontos de retirada por evento." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Locais,
});

function Locais() {
  const { event, eventId } = useCurrentEvent();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", date: "", start_time: "", end_time: "" });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations-full", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pickup_locations")
        .select("id,name,address,date,start_time,end_time")
        .eq("event_id", eventId!)
        .order("date");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function save() {
    if (!eventId || !form.name.trim()) { toast.error("Informe o nome do local."); return; }
    const { error } = await supabase.from("pickup_locations").insert({
      event_id: eventId,
      name: form.name.trim(),
      address: form.address || null,
      date: form.date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
    });
    if (error) { toast.error("Não foi possível salvar", { description: error.message }); return; }
    await qc.invalidateQueries({ queryKey: ["locations-full", eventId] });
    await qc.invalidateQueries({ queryKey: ["locations", eventId] });
    setOpen(false);
    setForm({ name: "", address: "", date: "", start_time: "", end_time: "" });
    toast.success("Local cadastrado.");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("pickup_locations").delete().eq("id", id);
    if (error) { toast.error("Não foi possível excluir"); return; }
    await qc.invalidateQueries({ queryKey: ["locations-full", eventId] });
  }

  return (
    <AppShell>
      <PageHeader
        title="Locais de retirada"
        subtitle={event?.name ?? ""}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Novo local
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {locations.map((l) => (
          <Card key={l.id} className="shadow-card">
            <CardContent className="space-y-1 py-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <h2 className="truncate text-lg font-bold">{l.name}</h2>
                <Button variant="ghost" size="icon" onClick={() => void remove(l.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">{l.address || "Endereço não informado"}</p>
              <p className="text-sm font-medium">
                {formatDate(l.date)} · {l.start_time?.slice(0, 5) ?? "--"} às {l.end_time?.slice(0, 5) ?? "--"}
              </p>
            </CardContent>
          </Card>
        ))}
        {locations.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum local cadastrado.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo local de retirada</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
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
