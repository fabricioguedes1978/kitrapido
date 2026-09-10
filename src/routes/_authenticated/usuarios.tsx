import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";
import { saveEventTeamUser } from "@/lib/team.functions";
import { ROLE_LABEL, formatCPF, isValidCPF, onlyDigits } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Equipe do evento — Kit Rápido" },
      { name: "description", content: "Cadastre o gerente e os staffs de cada evento com acesso por CPF." },
      { property: "og:title", content: "Equipe do evento — Kit Rápido" },
      { property: "og:description", content: "Gerente e staffs com acesso restrito ao evento." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Usuarios,
});

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  profiles: { name: string; email: string; cpf: string | null } | null;
};

function Usuarios() {
  const { event, eventId } = useCurrentEvent();
  const { isAdmin, isOrganizer } = useAuth();
  const canManage = isAdmin || isOrganizer;
  const qc = useQueryClient();
  const saveTeamUser = useServerFn(saveEventTeamUser);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"organizer" | "attendant">("attendant");

  const [newOpen, setNewOpen] = useState<null | "organizer" | "attendant">(null);
  const [form, setForm] = useState({ name: "", cpf: "", password: "" });
  const [saving, setSaving] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["members", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_members")
        .select("id,user_id,role,profiles:user_id(name,email,cpf)")
        .eq("event_id", eventId!);
      if (error) throw error;
      return (data ?? []) as unknown as MemberRow[];
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

  function openNew(kind: "organizer" | "attendant") {
    setForm({ name: "", cpf: "", password: "" });
    setNewOpen(kind);
  }

  async function saveNew() {
    if (!eventId || !newOpen) return;
    const cpf = onlyDigits(form.cpf);
    if (!isValidCPF(cpf)) { toast.error("Informe um CPF válido."); return; }
    const password = form.password;
    if (password.length < 6) {
      toast.error(`Crie uma senha com pelo menos 6 caracteres para o ${newOpen === "organizer" ? "gerente" : "staff"}.`);
      return;
    }
    setSaving(true);
    try {
      await saveTeamUser({
        data: { eventId, cpf, name: form.name.trim() || formatCPF(cpf), password, role: newOpen },
      });
      await qc.invalidateQueries({ queryKey: ["members", eventId] });
      setNewOpen(null);
      toast.success(newOpen === "organizer" ? "Gerente cadastrado." : "Staff cadastrado.", {
        description: `Entra com o CPF ${formatCPF(cpf)} e a senha definida agora.`,
      });
    } catch (err) {
      toast.error("Não foi possível salvar", { description: (err as Error).message });
    }
    setSaving(false);
  }

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
        action={
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <Button onClick={() => openNew("organizer")}>
                <ShieldCheck className="size-4" /> Novo gerente
              </Button>
            )}
            <Button variant={canManage ? "outline" : "default"} onClick={() => openNew("attendant")}>
              <UserPlus className="size-4" /> Novo staff
            </Button>
            <Button variant="ghost" onClick={() => setOpen(true)}>
              Vincular por e-mail
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="text-muted-foreground space-y-1 py-4 text-sm">
          <p>
            <strong className="text-foreground">Gerente:</strong> entra com o CPF e a senha criada
            pelo administrador. A senha pode conter letras, números e caracteres especiais. Pode
            cadastrar atletas, editar dados e criar os staffs deste evento.
          </p>
          <p>
            <strong className="text-foreground">Staff:</strong> entra com o CPF e a senha criada pelo
            gerente. Só faz a entrega do kit, inclusive para terceiros informando quem retirou.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF / acesso</TableHead>
                <TableHead>Função</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.profiles?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {m.profiles?.cpf ? formatCPF(m.profiles.cpf) : (m.profiles?.email ?? "—")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {m.role === "organizer" ? "Gerente" : (ROLE_LABEL[m.role] ?? m.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {m.profiles?.cpf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm({
                            name: m.profiles?.name ?? "",
                            cpf: m.profiles?.cpf ?? "",
                            password: "",
                          });
                          setNewOpen(m.role === "organizer" ? "organizer" : "attendant");
                        }}
                      >
                        <KeyRound className="size-4" /> Senha
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => void remove(m.id)}>
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Nenhuma pessoa vinculada a este evento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!newOpen} onOpenChange={(v) => !v && setNewOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {newOpen === "organizer" ? "Gerente do evento" : "Staff de entrega"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome da pessoa"
              />
            </div>
            <div className="space-y-1.5">
              <Label>CPF (usado para entrar)</Label>
              <Input
                inputMode="numeric"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{newOpen === "organizer" ? "Senha do gerente" : "Senha do staff"}</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="mínimo 6 caracteres"
              />
              <p className="text-muted-foreground text-xs">
                Pode usar letras, números e caracteres especiais.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={() => void saveNew()}>
              Salvar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <SelectItem value="organizer">Gerente</SelectItem>
                  <SelectItem value="attendant">Staff</SelectItem>
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
