import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCPF, isValidCPF, onlyDigits } from "@/lib/cronochip";
import { consumeTeamPasswordResetLink } from "@/lib/team-password-reset";

export const Route = createFileRoute("/redefinir-acesso")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Redefinir acesso — Kit Rápido" },
      { name: "description", content: "Crie uma nova senha para acessar o Kit Rápido." },
      { property: "og:title", content: "Redefinir acesso — Kit Rápido" },
      { property: "og:description", content: "Redefinição segura de senha da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RedefinirAcessoPage,
});

function RedefinirAcessoPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cpfDigits = onlyDigits(cpf);
    if (!/^[a-f0-9]{64}$/.test(token)) {
      toast.error("Este link de redefinição é inválido.");
      return;
    }
    if (!isValidCPF(cpfDigits)) {
      toast.error("Informe um CPF válido.");
      return;
    }
    if (!password || password.length > 128) {
      toast.error("Informe uma senha com até 128 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await consumeTeamPasswordResetLink(token, cpfDigits, password);
      setDone(true);
    } catch (error) {
      toast.error("Não foi possível redefinir a senha", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-dark-gradient flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Link to="/"><Brand inverted /></Link>
      <Card className="w-full max-w-md shadow-card">
        {done ? (
          <CardContent className="space-y-5 pt-6 text-center">
            <CheckCircle2 className="text-primary mx-auto size-12" />
            <div>
              <h1 className="text-xl font-semibold">Senha alterada</h1>
              <p className="text-muted-foreground mt-2 text-sm">Você já pode entrar com seu CPF e a nova senha.</p>
            </div>
            <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>Ir para o login</Button>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="text-primary size-5" /> Criar nova senha</CardTitle>
              <CardDescription>Informe seu CPF e escolha uma nova senha.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-cpf">CPF</Label>
                  <Input id="reset-cpf" inputMode="numeric" autoComplete="username" required maxLength={14} value={cpf} onChange={(event) => setCpf(formatCPF(event.target.value))} placeholder="000.000.000-00" />
                </div>
                <PasswordInput id="reset-password" label="Nova senha" value={password} onChange={setPassword} visible={visible} onToggle={() => setVisible((value) => !value)} />
                <PasswordInput id="reset-confirm" label="Confirmar nova senha" value={confirm} onChange={setConfirm} visible={visible} />
                <p className="text-muted-foreground text-xs">O link é válido por 30 minutos e funciona uma única vez.</p>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />} Salvar nova senha
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}

function PasswordInput({ id, label, value, onChange, visible, onToggle }: { id: string; label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle?: () => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} autoComplete="new-password" required maxLength={128} className={onToggle ? "pr-10" : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
        {onToggle && <Button type="button" variant="ghost" size="icon" className="text-muted-foreground absolute top-1/2 right-0.5 -translate-y-1/2 shadow-none" onClick={onToggle} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible} title={visible ? "Ocultar senha" : "Mostrar senha"}>{visible ? <EyeOff /> : <Eye />}</Button>}
      </div>
    </div>
  );
}