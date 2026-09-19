import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clipboard, Clock3, KeyRound, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";
import { ROLE_LABEL, formatCPF, isValidCPF, onlyDigits } from "@/lib/cronochip";
import { createTeamPasswordReset } from "@/lib/team-password.functions";

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

type InviteRow = {
  id: string;
  cpf: string;
  name: string;
  role: "organizer" | "attendant";
  status: string;
  created_at: string;
  expires_at: string;
};

function Usuarios() {
  const { event, eventId } = useCurrentEvent();
  const { isAdmin, isOrganizer } = useAuth();
  const canManage = isAdmin || isOrganizer;
  const qc = useQueryClient();
  const createPasswordReset = useServerFn(createTeamPasswordReset);

  const [newOpen, setNewOpen] = useState<null | "organizer" | "attendant">(null);
  const [form, setForm] = useState({ name: "", cpf: "" });
  const [saving, setSaving] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetMember, setResetMember] = useState<MemberRow | null>(null);
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["members", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      if (!eventId) return [];

      const { data: memberData, error: memberError } = await supabase
        .from("event_members")
        .select("id,user_id,role")
        .eq("event_id", eventId);
      if (memberError) throw memberError;

      const userIds = (memberData ?? []).map((member) => member.user_id);
      if (userIds.length === 0) return [];

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,name,email,cpf")
        .in("id", userIds);
      if (profileError) throw profileError;

      const profilesById = new Map((profileData ?? []).map((profile) => [profile.id, profile]));
      return (memberData ?? []).map((member) => ({
        ...member,
        profiles: profilesById.get(member.user_id) ?? null,
      })) as MemberRow[];
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["team-invites", eventId],
    enabled: !!eventId && canManage,
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase.rpc("list_team_invites", { _event_id: eventId });
      if (error) throw error;
      return (data ?? []) as InviteRow[];
    },
  });

  function openNew(kind: "organizer" | "attendant") {
    setForm({ name: "", cpf: "" });
    setCreatedInvite(null);
    setCopied(false);
    setNewOpen(kind);
  }

  async function saveNew() {
    if (!eventId || !newOpen) return;
    const cpf = onlyDigits(form.cpf);
    if (!isValidCPF(cpf)) { toast.error("Informe um CPF válido."); return; }
    if (form.name.trim().length < 2) {
      toast.error("Informe o nome da pessoa.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("create_team_invite", {
      _event_id: eventId,
      _cpf: cpf,
      _name: form.name.trim(),
      _role: newOpen,
    });
    setSaving(false);
    if (error || !data?.[0]) {
      toast.error("Não foi possível criar o convite", { description: error?.message });
      return;
    }
    if (!data[0].activation_code) {
      setNewOpen(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["members", eventId] }),
        qc.invalidateQueries({ queryKey: ["team-invites", eventId] }),
        qc.invalidateQueries({ queryKey: ["events"] }),
      ]);
      toast.success("Acesso vinculado ao evento", {
        description: "A pessoa já possui conta e pode usar a senha atual.",
      });
      return;
    }
    setCreatedInvite({ code: data[0].activation_code, expiresAt: data[0].invite_expires_at });
    await qc.invalidateQueries({ queryKey: ["team-invites", eventId] });
    toast.success("Convite criado.");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("event_members").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover"); return; }
    await qc.invalidateQueries({ queryKey: ["members", eventId] });
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase.rpc("revoke_team_invite", { _invite_id: id });
    if (error) {
      toast.error("Não foi possível cancelar o convite", { description: error.message });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["team-invites", eventId] });
    toast.success("Convite cancelado.");
  }

  async function copyInvite() {
    if (!createdInvite) return;
    await navigator.clipboard.writeText(createdInvite.code);
    setCopied(true);
    toast.success("Código copiado.");
  }

  async function generateResetCode() {
    if (!eventId || !resetMember) return;
    setResetLoading(true);
    try {
      const result = await createPasswordReset({
        data: { eventId, userId: resetMember.user_id },
      });
      setResetCode(result.code);
      toast.success("Código de recuperação criado.");
    } catch (error) {
      toast.error("Não foi possível gerar o código", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setResetLoading(false);
    }
  }

  async function copyResetCode() {
    if (!resetCode) return;
    await navigator.clipboard.writeText(resetCode);
    toast.success("Código copiado.");
  }

  return (
    <AppShell>
      <PageHeader
        title="Equipe do evento"
        subtitle={event?.name ?? ""}
        action={
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button onClick={() => openNew("organizer")}>
                <ShieldCheck className="size-4" /> Convidar gerente
              </Button>
            )}
            {canManage && (
              <Button variant={isAdmin ? "outline" : "default"} onClick={() => openNew("attendant")}>
                <UserPlus className="size-4" /> Convidar staff
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="text-muted-foreground space-y-1 py-4 text-sm">
          <p>
            <strong className="text-foreground">Gerente:</strong> recebe um código do administrador,
            ativa o acesso com CPF e cria a própria senha. Pode convidar somente staffs deste evento.
          </p>
          <p>
            <strong className="text-foreground">Staff:</strong> recebe um código do administrador ou
            gerente, ativa o acesso e cria a própria senha.
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
                    {(isAdmin || m.role === "attendant") && <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setResetCode(null); setResetMember(m); }}>
                        <KeyRound /> Redefinir senha
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void remove(m.id)}>Remover</Button>
                    </div>}
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

      {canManage && invites.some((invite) => invite.status === "pending") && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Convites pendentes</h2>
              <p className="text-muted-foreground text-xs">O código aparece somente no momento da criação.</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CPF</TableHead><TableHead>Função</TableHead><TableHead>Validade</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {invites.filter((invite) => invite.status === "pending").map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.name}</TableCell>
                      <TableCell>{formatCPF(invite.cpf)}</TableCell>
                      <TableCell><Badge variant="secondary">{invite.role === "organizer" ? "Gerente" : "Staff"}</Badge></TableCell>
                      <TableCell className="text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> {new Date(invite.expires_at).toLocaleDateString("pt-BR")}</span></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => void revokeInvite(invite.id)}><Trash2 /> Cancelar</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!newOpen} onOpenChange={(v) => !v && setNewOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdInvite ? "Convite criado" : newOpen === "organizer" ? "Convidar gerente" : "Convidar staff"}
            </DialogTitle>
            <DialogDescription>
              {createdInvite ? "Entregue este código à pessoa. Ele não será mostrado novamente." : "O convite é válido por 7 dias e só pode ser usado uma vez."}
            </DialogDescription>
          </DialogHeader>
          {createdInvite ? (
            <div className="space-y-4">
              <div className="bg-muted rounded-md border p-4 text-center">
                <p className="text-muted-foreground text-xs">Código de ativação</p>
                <p className="mt-1 font-mono text-2xl font-bold">{createdInvite.code}</p>
              </div>
              <Button className="w-full" variant="outline" onClick={() => void copyInvite()}>
                {copied ? <Check /> : <Clipboard />} {copied ? "Código copiado" : "Copiar código"}
              </Button>
              <p className="text-muted-foreground text-center text-xs">A pessoa deve acessar “Ativar meu acesso” na tela de login.</p>
            </div>
          ) : <div className="space-y-3">
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
                onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
          </div>}
          <DialogFooter>
            {createdInvite ? (
              <Button onClick={() => setNewOpen(null)}>Concluir</Button>
            ) : (
              <Button disabled={saving} onClick={() => void saveNew()}>Criar convite</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetMember} onOpenChange={(open) => { if (!open) { setResetMember(null); setResetCode(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{resetCode ? "Código de recuperação" : "Redefinir senha"}</DialogTitle>
            <DialogDescription>
              {resetCode
                ? "Entregue este código à pessoa. Ele aparece somente agora e vale por 30 minutos."
                : `Gerar um código temporário para ${resetMember?.profiles?.name ?? "esta pessoa"}?`}
            </DialogDescription>
          </DialogHeader>
          {resetCode && <div className="space-y-4">
            <div className="bg-muted rounded-md border p-4 text-center">
              <p className="text-muted-foreground text-xs">Código de recuperação</p>
              <p className="mt-1 font-mono text-2xl font-bold">{resetCode}</p>
            </div>
            <Button className="w-full" variant="outline" onClick={() => void copyResetCode()}>
              <Clipboard /> Copiar código
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              A pessoa deve usar “Esqueci minha senha” na tela de login.
            </p>
          </div>}
          <DialogFooter>
            {resetCode
              ? <Button onClick={() => { setResetMember(null); setResetCode(null); }}>Concluir</Button>
              : <Button disabled={resetLoading} onClick={() => void generateResetCode()}>
                  {resetLoading && <Clock3 className="animate-spin" />} Gerar código
                </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
