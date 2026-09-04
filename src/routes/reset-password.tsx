import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — Cronochip Kit" },
      { name: "description", content: "Defina uma nova senha de acesso ao Cronochip Kit." },
      { property: "og:title", content: "Redefinir senha — Cronochip Kit" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error("Não foi possível alterar a senha", { description: error.message }); return; }
    toast.success("Senha alterada com sucesso.");
    navigate({ to: "/central", replace: true });
  }

  return (
    <div className="bg-dark-gradient flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Brand inverted />
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="np">Nova senha</Label>
              <Input
                id="np"
                type="password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              Salvar nova senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
