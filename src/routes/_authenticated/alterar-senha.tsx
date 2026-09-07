import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
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
      { title: "Alterar Senha | KIT RÁPIDO" },
      { name: "description", content: "Altere a senha da sua conta de administrador no KIT RÁPIDO." },
      { property: "og:title", content: "Alterar Senha | KIT RÁPIDO" },
      { property: "og:description", content: "Altere a senha da sua conta de administrador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlterarSenhaPage,
});

function AlterarSenhaPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (role && role !== "admin") {
    return (
      <AppShell>
        <PageHeader title="Acesso restrito" subtitle="Somente o administrador pode alterar a senha." />
      </AppShell>
    );
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
    void navigate({ to: "/dashboard" });
  }

  return (
    <AppShell>
      <PageHeader title="Alterar Senha" subtitle="Defina uma nova senha para a sua conta de administrador" />
      <Card className="max-w-md">
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
    </AppShell>
  );
}
