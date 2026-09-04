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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEvent } from "@/hooks/useEvents";
import { ROLE_LABEL } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Cronochip Kit" },
      { name: "description", content: "Vincule organizadores e atendentes às equipes de cada evento." },
      { property: "og:title", content: "Usuários — Cronochip Kit" },
      { property: "og:description", content: "Equipe do evento e permissões de acesso." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Usuarios,
});

function Usuarios() {
  const { event, eventId } = useCurrentEvent();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"organizer" | "attendant">("attendant");

  const { data: members = [] } = useQuery({
    queryKey: ["members", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_members")
        .select("id,user_id,role,profiles:user_id(name,email)")
        .eq("event_id", eventId!);
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        user_id: string;
        role: string;
        profiles: { name: string; email: string } | null;
      }[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,name,email").order("name");
      return data ?? [];
    },
  });

  const available = useMemo(
    () => profiles.filter((p) => !members.some((m) => m.user_id === p.id)),
    [profiles, members],
  );

  async function add() {
    if (!eventId) return;
    const profile = available.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
    if (!profile)
      { toast.error("Usuário não encontrado", {
        description: "A pessoa precisa criar a conta no sistema antes de ser vinculada.",
      }); return; }
    const { error } = await supabase
      .from("event_members")
      .insert({ event_id: eventId, user_id: profile.id, role });
    if (error) { toast.error("Não foi possível vincular", { description: error.message }); return; }
    await qc.invalidateQueries({ queryKey: ["members", eventId] });
    setOpen(false);
    setEmail("");
    toast.success("Usuário vinculado ao evento.");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("event_members").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover"); return; }
    await qc.invalidateQueries({ queryKey: ["members", eventId] });
  }

  return (
    <AppShell>
      <PageHeader
        title="Equipe do evento"
        subtitle={event?.name ?? ""}
        action={<Button onClick={() => setOpen(true)}>Vincular usuário</Button>}
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.profiles?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{m.profiles?.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABEL[m.role] ?? m.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => void remove(m.id)}>
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Nenhum usuário vinculado a este evento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular usuário ao evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>E-mail cadastrado</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Função</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organizer">Organizador</SelectItem>
                  <SelectItem value="attendant">Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void add()}>Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
