import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/alterar-senha")({
  head: () => ({
    meta: [
      { title: "E-mail e Senha | KIT RÁPIDO" },
      { name: "description", content: "Altere o e-mail e a senha da conta de administrador no KIT RÁPIDO." },
      { property: "og:title", content: "E-mail e Senha | KIT RÁPIDO" },
      { property: "og:description", content: "Altere o e-mail e a senha da conta de administrador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlterarSenhaPage,
});

function AlterarSenhaPage() {
  const { role, user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailLoading, setEmailLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (role && role !== "admin") {
    return (
      <AppShell>
        <PageHeader title="Acesso restrito" subtitle="Somente o administrador pode alterar e-mail e senha." />
      </AppShell>
    );
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (value === (user?.email ?? "").toLowerCase()) {
      toast.error("Este já é o e-mail atual.");
      return;
    }
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: value });
    setEmailLoading(false);
    if (error) {
      toast.error(`Não foi possível alterar o e-mail: ${error.message}`);
      return;
    }
    toast.success("Solicitação enviada. Confirme pelo link enviado ao novo e-mail.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(`Não foi possível alterar a senha: ${error.message}`);
      return;
    }
    toast.success("Senha alterada com sucesso!");
    setPassword("");
    setConfirm("");
  }

  return (
    <AppShell>
      <PageHeader title="E-mail e Senha" subtitle="Atualize os dados de acesso da conta de administrador" />
      <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="text-primary size-5" /> Alterar e-mail
            </CardTitle>
            <CardDescription>
              {user?.email ? `E-mail atual: ${user.email}` : "Defina o e-mail de acesso."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmail} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-email">Novo e-mail</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={emailLoading}>
                {emailLoading && <Loader2 className="size-4 animate-spin" />} Salvar novo e-mail
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="text-primary size-5" /> Nova senha
            </CardTitle>
            <CardDescription>A senha deve ter no mínimo 6 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />} Salvar nova senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
