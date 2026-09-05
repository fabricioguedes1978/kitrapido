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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEvent } from "@/hooks/useEvents";

export const Route = createFileRoute("/_authenticated/kits")({
  head: () => ({
    meta: [
      { title: "Kits — Kit Fácil" },
      { name: "description", content: "Monte os tipos de kit e os itens que compõem cada um." },
      { property: "og:title", content: "Kits — Kit Fácil" },
      { property: "og:description", content: "Composição de kits por evento." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Kits,
});

function Kits() {
  const { event, eventId } = useCurrentEvent();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", items: "" });

  const { data: kits = [] } = useQuery({
    queryKey: ["kits", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kits")
        .select("id,name,description,active,kit_items(id,name,quantity)")
        .eq("event_id", eventId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function save() {
    if (!eventId || !form.name.trim()) { toast.error("Informe o nome do kit."); return; }
    const { data, error } = await supabase
      .from("kits")
      .insert({ event_id: eventId, name: form.name.trim(), description: form.description || null })
      .select("id")
      .single();
    if (error || !data) { toast.error("Não foi possível salvar o kit"); return; }

    const items = form.items
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const match = /^(\d+)\s*x\s*(.+)$/i.exec(l);
        return { kit_id: data.id, name: match ? match[2]! : l, quantity: match ? Number(match[1]) : 1 };
      });
    if (items.length) await supabase.from("kit_items").insert(items);

    await qc.invalidateQueries({ queryKey: ["kits", eventId] });
    setOpen(false);
    setForm({ name: "", description: "", items: "" });
    toast.success("Kit criado.");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("kits").delete().eq("id", id);
    if (error) { toast.error("Não foi possível excluir"); return; }
    await qc.invalidateQueries({ queryKey: ["kits", eventId] });
  }

  return (
    <AppShell>
      <PageHeader
        title="Kits"
        subtitle={event?.name ?? ""}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Novo kit
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {kits.map((k) => (
          <Card key={k.id} className="shadow-card">
            <CardContent className="space-y-2 py-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <h2 className="truncate text-lg font-bold">{k.name}</h2>
                <Button variant="ghost" size="icon" onClick={() => void remove(k.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {k.description && <p className="text-muted-foreground text-sm">{k.description}</p>}
              <div className="flex flex-wrap gap-1 pt-1">
                {k.kit_items.map((i) => (
                  <Badge key={i.id} variant="outline">
                    {i.quantity}x {i.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {kits.length === 0 && <p className="text-muted-foreground text-sm">Nenhum kit cadastrado.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo kit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Itens (um por linha, ex.: 1x Camiseta)</Label>
              <Textarea
                rows={5}
                value={form.items}
                onChange={(e) => setForm({ ...form, items: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void save()}>Salvar kit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
