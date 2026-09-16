import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, isValidCPF, onlyDigits } from "@/lib/cronochip";
import { cpfLogin, teamAuthPassword } from "@/lib/team.functions";

export const Route = createFileRoute("/ativar-acesso")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ativar acesso — Kit Rápido" },
      { name: "description", content: "Ative seu acesso à equipe de um evento no Kit Rápido." },
      { property: "og:title", content: "Ativar acesso — Kit Rápido" },
      { property: "og:description", content: "Ativação segura de acesso para gerente e staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivateAccessPage,
});

function ActivateAccessPage() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);

  async function activate(event: React.FormEvent) {
    event.preventDefault();
    const cpfDigits = onlyDigits(cpf);
    const activationCode = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!isValidCPF(cpfDigits)) {
      toast.error("Informe um CPF válido.");
      return;
    }
    if (activationCode.length !== 8) {
      toast.error("Informe o código de convite com 8 caracteres.");
      return;
    }
    if (!password || password.length > 128) {
      toast.error("Informe uma senha com até 128 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: cpfLogin(cpfDigits),
      password: teamAuthPassword(password),
      options: { data: { activation_code: activationCode } },
    });
    setLoading(false);

    if (error) {
      const duplicate = /already|registered|exists/i.test(error.message);
      toast.error(duplicate ? "Este CPF já possui acesso" : "Não foi possível ativar", {
        description: duplicate
          ? "Entre com sua senha atual. Para outro evento, peça ao administrador para vincular sua conta existente."
          : "Confira o CPF e o código, ou solicite um novo convite.",
      });
      return;
    }
    setActivated(true);
  }

  if (activated) {
    return (
      <main className="bg-dark-gradient flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="space-y-5 pt-6 text-center">
            <CheckCircle2 className="text-primary mx-auto size-12" />
            <div>
              <h1 className="text-xl font-semibold">Acesso ativado</h1>
              <p className="text-muted-foreground mt-2 text-sm">Você já pode entrar com seu CPF e a senha escolhida.</p>
            </div>
            <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>Ir para o login</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="bg-dark-gradient flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Link to="/"><Brand inverted /></Link>
      <Card className="w-full max-w-md shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="text-primary size-5" /> Ativar acesso</CardTitle>
          <CardDescription>Use o CPF e o código recebidos do administrador ou gerente.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={activate}>
            <div className="space-y-1.5">
              <Label htmlFor="activation-cpf">CPF</Label>
              <Input id="activation-cpf" inputMode="numeric" autoComplete="username" required maxLength={14} value={cpf} onChange={(event) => setCpf(formatCPF(event.target.value))} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activation-code">Código do convite</Label>
              <Input id="activation-code" autoCapitalize="characters" required maxLength={9} value={code} onChange={(event) => setCode(formatActivationCode(event.target.value))} placeholder="AB12-CD34" />
            </div>
            <PasswordField id="activation-password" label="Crie sua senha" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
            <PasswordField id="activation-confirm" label="Confirme sua senha" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} />
            <p className="text-muted-foreground text-xs">A senha pode conter somente números, somente letras ou caracteres especiais.</p>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />} Ativar acesso
            </Button>
            <Button asChild type="button" variant="ghost" className="w-full">
              <Link to="/auth"><ArrowLeft /> Voltar ao login</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function formatActivationCode(value: string) {
  const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

function PasswordField({ id, label, value, onChange, visible, onToggle }: { id: string; label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle?: () => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} autoComplete="new-password" required maxLength={128} className={onToggle ? "pr-10" : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
        {onToggle && (
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground absolute top-1/2 right-0.5 -translate-y-1/2 shadow-none" onClick={onToggle} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible} title={visible ? "Ocultar senha" : "Mostrar senha"}>
            {visible ? <EyeOff /> : <Eye />}
          </Button>
        )}
      </div>
    </div>
  );
}