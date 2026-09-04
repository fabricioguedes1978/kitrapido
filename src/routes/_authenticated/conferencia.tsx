import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Maximize2, MonitorSmartphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { IDLE_STATE, readDisplay, subscribeDisplay, type DisplayState } from "@/lib/display";

export const Route = createFileRoute("/_authenticated/conferencia")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Conferência do Atleta — Cronochip Kit" },
      {
        name: "description",
        content: "Tela ampliada para o atleta conferir seus dados antes de receber o kit.",
      },
      { property: "og:title", content: "Conferência do Atleta — Cronochip Kit" },
      { property: "og:description", content: "Monitor de conferência de dados na retirada do kit." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Conferencia,
});

function Conferencia() {
  const [state, setState] = useState<DisplayState>(IDLE_STATE);

  useEffect(() => {
    setState(readDisplay());
    return subscribeDisplay(setState);
  }, []);

  function fullscreen() {
    void document.documentElement.requestFullscreen?.();
  }

  return (
    <div className="bg-dark-gradient text-sidebar-foreground min-h-screen p-6 sm:p-10">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Brand inverted />
        <Button variant="secondary" size="sm" onClick={fullscreen}>
          <Maximize2 className="size-4" /> Tela cheia
        </Button>
      </header>

      {state.status === "idle" && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <MonitorSmartphone className="size-16 opacity-60" />
          <p className="text-3xl font-extrabold">Aguardando o próximo atleta…</p>
          <p className="text-sidebar-foreground/70 text-lg">
            Os dados aparecerão aqui quando o atendente selecionar a inscrição.
          </p>
        </div>
      )}

      {state.status === "delivered" && (
        <div className="border-success/40 bg-success/15 flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-3xl border text-center">
          <CheckCircle2 className="text-success size-24" />
          <p className="text-success text-5xl font-extrabold">KIT ENTREGUE ✓</p>
          <p className="text-4xl font-bold">{state.name}</p>
          <p className="text-2xl font-semibold">Nº {state.bib || "—"}</p>
        </div>
      )}

      {(state.status === "review" || state.status === "blocked") && (
        <div className="mx-auto max-w-5xl">
          {state.status === "blocked" && (
            <p className="bg-destructive/20 text-destructive-foreground mb-6 flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-2xl font-extrabold">
              <AlertTriangle className="size-8" /> KIT JÁ ENTREGUE ANTERIORMENTE
            </p>
          )}
          <p className="text-primary text-lg font-bold tracking-[0.2em] uppercase">
            Confira seus dados
          </p>
          <h1 className="mt-1 text-5xl leading-tight font-extrabold sm:text-6xl">{state.name}</h1>
          <p className="text-sidebar-foreground/70 mt-2 text-xl">{state.eventName}</p>

          <dl className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Big label="Nº de peito" value={state.bib} />
            <Big label="Camiseta" value={state.shirt} />
            <Big label="Modalidade" value={state.modality} />
            <Big label="Categoria" value={state.category} />
            <Big label="Kit" value={state.kit} />
            <Big label="Inscrição" value={state.registration} />
            {(state.fields ?? []).map((f) => (
              <Big key={f.label} label={f.label} value={f.value} />
            ))}
          </dl>

          <p className="text-sidebar-foreground/70 mt-10 text-xl">
            Se algum dado estiver incorreto, avise o atendente antes de receber o kit.
          </p>
        </div>
      )}
    </div>
  );
}

function Big({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-sidebar-accent/30 min-w-0 rounded-2xl p-5">
      <dt className="text-sidebar-foreground/60 text-sm font-semibold tracking-wide uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-3xl font-extrabold break-words">{value || "—"}</dd>
    </div>
  );
}
