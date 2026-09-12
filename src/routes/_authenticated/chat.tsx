import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Loader2, MessageCircle, MessagesSquare } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ChatMode = "fixed" | "ai";

const OPTIONS: { value: ChatMode; title: string; description: string; icon: typeof Bot }[] = [
  {
    value: "fixed",
    title: "Respostas fixas",
    description: "Exibe as perguntas frequentes atuais. Não usa créditos de IA.",
    icon: MessagesSquare,
  },
  {
    value: "ai",
    title: "Respostas com IA",
    description: "A Ana responde livremente seguindo as orientações do KIT RÁPIDO.",
    icon: Bot,
  },
];

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat | KIT RÁPIDO" },
      { name: "description", content: "Configure o atendimento virtual do KIT RÁPIDO." },
      { property: "og:title", content: "Chat | KIT RÁPIDO" },
      { property: "og:description", content: "Configuração administrativa do atendimento virtual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatSettingsPage,
});

function ChatSettingsPage() {
  const { role, user } = useAuth();
  const [mode, setMode] = useState<ChatMode>("fixed");
  const [savedMode, setSavedMode] = useState<ChatMode>("fixed");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase
      .from("chat_settings")
      .select("mode")
      .eq("id", "global")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(`Não foi possível carregar o chat: ${error.message}`);
        const current = data?.mode === "ai" ? "ai" : "fixed";
        setMode(current);
        setSavedMode(current);
        setLoading(false);
      });
  }, []);

  if (role && role !== "admin") {
    return (
      <AppShell>
        <PageHeader title="Acesso restrito" subtitle="Somente o administrador pode configurar o chat." />
      </AppShell>
    );
  }

  async function saveMode() {
    setSaving(true);
    const { error } = await supabase.from("chat_settings").upsert({
      id: "global",
      mode,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(`Não foi possível salvar: ${error.message}`);
      return;
    }
    setSavedMode(mode);
    toast.success(mode === "ai" ? "Respostas com IA ativadas." : "Respostas fixas ativadas.");
  }

  return (
    <AppShell>
      <PageHeader title="Chat" subtitle="Escolha como a Ana atenderá os visitantes do site" />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="text-primary size-5" /> Modo de atendimento
          </CardTitle>
          <CardDescription>As respostas fixas são o modo padrão e continuam disponíveis a qualquer momento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" /> Carregando configuração…
            </div>
          ) : (
            <>
              <RadioGroup value={mode} onValueChange={(value) => setMode(value as ChatMode)} className="grid gap-3 sm:grid-cols-2">
                {OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = mode === option.value;
                  return (
                    <label
                      key={option.value}
                      htmlFor={`chat-mode-${option.value}`}
                      className={cn(
                        "hover:bg-muted/50 flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors",
                        selected && "border-primary bg-primary/5 ring-primary/20 ring-2",
                      )}
                    >
                      <RadioGroupItem id={`chat-mode-${option.value}`} value={option.value} className="mt-1 shrink-0" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-semibold">
                          <Icon className="text-primary size-4" /> {option.title}
                        </span>
                        <span className="text-muted-foreground mt-1 block text-sm leading-relaxed">{option.description}</span>
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-sm">
                  Ativo agora: <strong className="text-foreground">{savedMode === "ai" ? "Respostas com IA" : "Respostas fixas"}</strong>
                </p>
                <Button onClick={() => void saveMode()} disabled={saving || mode === savedMode}>
                  {saving && <Loader2 className="size-4 animate-spin" />} Salvar configuração
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}