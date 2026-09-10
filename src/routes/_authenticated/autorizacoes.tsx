import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Pencil, Plus, QrCode } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEvent } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { isValidCPF, maskCPF, onlyDigits } from "@/lib/fetch-all";
import { fetchAllRows } from "@/lib/x-placeholder";cronochip";

export const Route = createFileRoute("/_authenticated/autorizacoes")({
  head: () => ({
    meta: [
      { title: "Autorizações — Kit Rápido" },
      { name: "description", content: "Autorize terceiros a retirar o kit e gere o QR Code de retirada." },
      { property: "og:title", content: "Autorizações — Kit Rápido" },
      { property: "og:description", content: "Retirada por terceiros com registro e QR Code." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Autorizacoes,
});

type Auth = {
  id: string;
  athlete_id: string;
  name: string;
  cpf: string;
  phone: string | null;
  qr_code: string;
  status: string;
  athletes: { name: string; bib_number: string | null } | null;
};

function Autorizacoes() {
  const { event, eventId } = useCurrentEvent();
  const { isAdmin, isOrganizer } = useAuth();
  const canManage = isAdmin || isOrganizer;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<Auth | null>(null);
  const [search, setSearch] = useState("");
  const [athleteId, setAthleteId] = useState("");
  const [editing, setEditing] = useState<Auth | null>(null);
  const [form, setForm] = useState({ name: "", cpf: "", phone: "" });

  const { data: list = [] } = useQuery({
    queryKey: ["tpa-full", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("third_party_authorizations")
        .select("id,athlete_id,name,cpf,phone,qr_code,status,athletes(name,bib_number)")
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Auth[];
    },
  });

  const { data: athletes = [] } = useQuery({
    queryKey: ["athletes", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      return await fetchAllRows<{ id: string; name: string; bib_number: string | null; cpf: string | null }>(() =>
        supabase
          .from("athletes")
          .select("id,name,bib_number,cpf")
          .eq("event_id", eventId!)
          .order("name"),
      );
    },
  });

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return athletes.filter((a) => a.name.toLowerCase().includes(q) || (a.bib_number ?? "").includes(q)).slice(0, 8);
  }, [athletes, search]);

  async function save() {
    if (!eventId) return;
    if (!editing && !athleteId) { toast.error("Selecione o atleta."); return; }
    if (!form.name.trim()) { toast.error("Informe o nome do autorizado."); return; }
    if (!isValidCPF(form.cpf)) { toast.error("CPF do autorizado inválido."); return; }
    const payload = {
      name: form.name.trim(),
      cpf: onlyDigits(form.cpf),
      phone: form.phone || null,
    };
    const { error } = editing
      ? await supabase.from("third_party_authorizations").update(payload).eq("id", editing.id)
      : await supabase.from("third_party_authorizations").insert({
          ...payload,
          event_id: eventId,
          athlete_id: athleteId,
        });
    if (error) { toast.error("Não foi possível salvar", { description: error.message }); return; }
    await qc.invalidateQueries({ queryKey: ["tpa-full", eventId] });
    await qc.invalidateQueries({ queryKey: ["tpa", eventId] });
    setOpen(false);
    setEditing(null);
    setForm({ name: "", cpf: "", phone: "" });
    setAthleteId("");
    setSearch("");
    toast.success(editing ? "Autorização atualizada." : "Autorização criada.");
  }

  async function cancel(id: string) {
    const { error } = await supabase
      .from("third_party_authorizations")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) { toast.error("Não foi possível cancelar"); return; }
    await qc.invalidateQueries({ queryKey: ["tpa-full", eventId] });
    await qc.invalidateQueries({ queryKey: ["tpa", eventId] });
  }

  return (
    <AppShell>
      <PageHeader
        title="Autorizações de terceiros"
        subtitle={event?.name ?? ""}
        action={
          <Button onClick={() => { setEditing(null); setForm({ name: "", cpf: "", phone: "" }); setAthleteId(""); setSearch(""); setOpen(true); }}>
            <Plus className="size-4" /> Nova autorização
          </Button>
        }
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atleta</TableHead>
                <TableHead>Autorizado</TableHead>
                <TableHead className="hidden sm:table-cell">CPF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-[180px] truncate font-medium">
                    {a.athletes?.name ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">{a.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{maskCPF(a.cpf)}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "active" ? "default" : "destructive"}>
                      {a.status === "active" ? "Ativa" : "Cancelada"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setQr(a)}>
                      <QrCode className="size-4" />
                    </Button>
                    {a.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar autorizado"
                        onClick={() => {
                          setEditing(a);
                          setForm({ name: a.name, cpf: maskCPF(a.cpf), phone: a.phone ?? "" });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    {canManage && a.status === "active" && (
                      <Button variant="ghost" size="sm" onClick={() => void cancel(a.id)}>
                        Cancelar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Nenhuma autorização cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!qr} onOpenChange={(v) => !v && setQr(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="truncate">{qr?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-2">
            {qr && <QRCodeSVG value={`CRONOCHIP-AUTH:${qr.qr_code}`} size={200} />}
            <p className="text-muted-foreground text-center text-xs">
              Apresentar junto com documento com foto na retirada.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar autorizado" : "Nova autorização"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
            <div className="space-y-1.5">
              <Label>Atleta</Label>
              <Input
                placeholder="Buscar atleta por nome ou nº"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setAthleteId("");
                }}
              />
              {options.length > 0 && !athleteId && (
                <div className="max-h-40 overflow-y-auto rounded-lg border">
                  {options.map((o) => (
                    <button
                      key={o.id}
                      className="hover:bg-accent block w-full truncate px-3 py-2 text-left text-sm"
                      onClick={() => {
                        setAthleteId(o.id);
                        setSearch(`${o.name} (nº ${o.bib_number ?? "—"})`);
                      }}
                    >
                      {o.name} — nº {o.bib_number ?? "—"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}
            <div className="space-y-1.5">
              <Label>Nome do autorizado</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void save()}>{editing ? "Salvar alterações" : "Gerar autorização"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
