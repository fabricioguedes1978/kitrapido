import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, UserCog, Users, ClipboardCheck, ArrowLeft } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { onlyDigits } from "@/lib/cronochip";
import { cpfLogin } from "@/lib/team.functions";

type LoginProfile = "admin" | "gerente" | "staff";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Kit Rápido" },
      { name: "description", content: "Acesse o painel de entrega de kits do Kit Rápido." },
      { property: "og:title", content: "Entrar — Kit Rápido" },
      { property: "og:description", content: "Acesso restrito a organizadores e atendentes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<LoginProfile | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/central", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const typed = email.trim();
    const digits = onlyDigits(typed);
    const identifier = digits.length === 11 && !typed.includes("@") ? cpfLogin(digits) : typed;
    const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
    setLoading(false);
    if (error) { toast.error("Não foi possível entrar", { description: error.message }); return; }
    navigate({ to: "/central", replace: true });
  }

  function selectProfile(p: LoginProfile) {
    setProfile(p);
    setEmail("");
    setPassword("");
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin, data: { name } },
    });
    setLoading(false);
    if (error) { toast.error("Não foi possível criar a conta", { description: error.message }); return; }
    if (data.session) return navigate({ to: "/central", replace: true });
    toast.success("Conta criada", { description: "Confirme o e-mail enviado para ativar o acesso." });
  }

  async function recover() {
    if (!email.trim()) { toast.error("Informe seu e-mail para recuperar a senha."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error("Não foi possível enviar o e-mail"); return; }
    toast.success("Enviamos um link de recuperação para o seu e-mail.");
  }

  return (
    <div className="bg-dark-gradient flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Link to="/">
        <Brand inverted />
      </Link>

      <Card className="shadow-card w-full max-w-sm">
        <CardContent className="pt-6">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {!profile ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground mb-3 text-center text-xs font-medium tracking-wide uppercase">
                    Como você quer entrar?
                  </p>
                  <ProfileButton
                    icon={<UserCog className="size-5" />}
                    title="Gerente"
                    description="CPF e senha do evento"
                    onClick={() => selectProfile("gerente")}
                  />
                  <ProfileButton
                    icon={<Users className="size-5" />}
                    title="Staff"
                    description="CPF e senha criada pelo gerente"
                    onClick={() => selectProfile("staff")}
                  />
                  <ProfileButton
                    icon={<ShieldCheck className="size-5" />}
                    title="Administrador"
                    description="Acesso total ao sistema"
                    onClick={() => selectProfile("admin")}
                  />
                  <Link
                    to="/checkin"
                    className="border-border hover:border-primary hover:bg-primary/5 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors"
                  >
                    <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
                      <ClipboardCheck className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">Check-in do atleta</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        Consulte pelo CPF e gere sua credencial
                      </span>
                    </span>
                  </Link>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={signIn}>
                  <button
                    type="button"
                    onClick={() => setProfile(null)}
                    className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs"
                  >
                    <ArrowLeft className="size-3.5" /> Voltar
                  </button>
                  <p className="text-sm font-semibold">
                    Entrar como{" "}
                    {profile === "admin" ? "Administrador" : profile === "gerente" ? "Gerente" : "Staff"}
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{profile === "admin" ? "E-mail" : "CPF"}</Label>
                    <Input
                      id="email"
                      type="text"
                      autoComplete="username"
                      required
                      inputMode={profile === "admin" ? "email" : "numeric"}
                      placeholder={profile === "admin" ? "seu@email.com" : "Somente números"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      placeholder={
                        profile === "gerente" ? "Senha inicial: data de nascimento (ddmmaaaa)" : undefined
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Entrar
                  </Button>
                  {profile === "admin" && (
                    <button
                      type="button"
                      onClick={() => void recover()}
                      className="text-muted-foreground hover:text-primary w-full text-center text-xs"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4" onSubmit={signUp}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">E-mail</Label>
                  <Input
                    id="email2"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2">Senha</Label>
                  <Input
                    id="password2"
                    type="password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-muted-foreground my-4 flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" /> ou <span className="bg-border h-px flex-1" />
          </div>
          <Button variant="outline" className="w-full" onClick={() => void google()}>
            Continuar com Google
          </Button>
        </CardContent>
      </Card>

      <Link to="/consulta" className="text-sidebar-foreground/70 hover:text-primary text-xs">
        Sou atleta — consultar meu kit
      </Link>
    </div>
  );
}

function ProfileButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-border hover:border-primary hover:bg-primary/5 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
      )}
    >
      <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground block truncate text-xs">{description}</span>
      </span>
    </button>
  );
}
