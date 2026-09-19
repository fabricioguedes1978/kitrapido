import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCPF, isValidCPF, onlyDigits } from "@/lib/cronochip";
import { resetTeamPassword } from "@/lib/team-password.functions";

export const Route = createFileRoute("/redefinir-acesso")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Redefinir acesso — Kit Rápido" },
    { name: "description", content: "Crie uma nova senha para acessar a equipe no Kit Rápido." },
    { property: "og:title", content: "Redefinir acesso — Kit Rápido" },
    { property: "og:description", content: "Recuperação segura de acesso para gerente e staff." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ResetTeamAccessPage,
});

function ResetTeamAccessPage() {
  const navigate = useNavigate();
  const resetPassword = useServerFn(resetTeamPassword);
  const [cpf, setCpf] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cpfDigits = onlyDigits(cpf);
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (!isValidCPF(cpfDigits)) return toast.error("Informe um CPF válido.");
    if (cleanCode.length !== 8) return toast.error("Informe o código com 8 caracteres.");
    if (!password || password.length > 128) return toast.error("Informe uma senha com até 128 caracteres.");
    if (password !== confirm) return toast.error("As senhas não coincidem.");

    setLoading(true);
    try {
      const result = await resetPassword({ data: { cpf: cpfDigits, code: cleanCode, password } });
      if (!result.ok) {
        toast.error("Código inválido ou expirado", { description: "Solicite um novo código ao administrador ou gerente." });
        return;
      }
      setComplete(true);
    } catch {
      toast.error("Não foi possível redefinir a senha", { description: "Solicite um novo código e tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return <main className="bg-dark-gradient flex min-h-screen flex-col items-center justify-center gap-6 p-4">
    <Link to="/"><Brand inverted /></Link>
    <Card className="w-full max-w-md shadow-card">
      {complete ? <CardContent className="space-y-5 pt-6 text-center">
        <CheckCircle2 className="text-primary mx-auto size-12" />
        <div><h1 className="text-xl font-semibold">Senha redefinida</h1><p className="text-muted-foreground mt-2 text-sm">Você já pode entrar com seu CPF e a nova senha.</p></div>
        <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>Ir para o login</Button>
      </CardContent> : <>
        <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="text-primary size-5" /> Redefinir acesso</CardTitle><CardDescription>Use o código temporário recebido do administrador ou gerente.</CardDescription></CardHeader>
        <CardContent><form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5"><Label htmlFor="reset-cpf">CPF</Label><Input id="reset-cpf" inputMode="numeric" autoComplete="username" required maxLength={14} value={cpf} onChange={(event) => setCpf(formatCPF(event.target.value))} placeholder="000.000.000-00" /></div>
          <div className="space-y-1.5"><Label htmlFor="reset-code">Código de recuperação</Label><Input id="reset-code" autoCapitalize="characters" required maxLength={9} value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="AB12CD34" /></div>
          <PasswordInput id="reset-password" label="Nova senha" value={password} onChange={setPassword} visible={visible} onToggle={() => setVisible((value) => !value)} />
          <PasswordInput id="reset-confirm" label="Confirmar nova senha" value={confirm} onChange={setConfirm} visible={visible} />
          <Button className="w-full" type="submit" disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />} Salvar nova senha</Button>
          <Button asChild className="w-full" type="button" variant="outline"><Link to="/auth">Voltar ao login</Link></Button>
        </form></CardContent>
      </>}
    </Card>
  </main>;
}

function PasswordInput({ id, label, value, onChange, visible, onToggle }: { id: string; label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle?: () => void }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type={visible ? "text" : "password"} autoComplete="new-password" required maxLength={128} className={onToggle ? "pr-10" : undefined} value={value} onChange={(event) => onChange(event.target.value)} />{onToggle && <Button type="button" variant="ghost" size="icon" className="text-muted-foreground absolute top-1/2 right-0.5 -translate-y-1/2 shadow-none" onClick={onToggle} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible}>{visible ? <EyeOff /> : <Eye />}</Button>}</div></div>;
}