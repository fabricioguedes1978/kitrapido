import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, ShieldCheck, Boxes, Gauge, ArrowRight } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kit Rápido — Gestão de entrega de kits de corrida" },
      {
        name: "description",
        content:
          "Plataforma do Kit Rápido para entrega de kits: leitura de QR Code, bloqueio de duplicidade, estoque de camisetas e dashboard em tempo real.",
      },
      { property: "og:title", content: "Kit Rápido — Entrega de kits de corrida" },
      {
        property: "og:description",
        content: "Velocidade na retirada, controle de estoque e rastreabilidade total.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ScanLine, title: "Leitura por QR Code", text: "Retirada em segundos, direto do celular ou tablet." },
  { icon: ShieldCheck, title: "Zero duplicidade", text: "Bloqueio automático de segunda entrega para o mesmo atleta." },
  { icon: Boxes, title: "Estoque em tempo real", text: "Baixa automática de camisetas e alerta de estoque baixo." },
  { icon: Gauge, title: "Dashboard ao vivo", text: "Entregas por hora, por tamanho, por atendente e por local." },
];

function Landing() {
  return (
    <div className="bg-background min-h-screen">
      <header className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-5">
        <Brand />
        <Button asChild size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:pt-16">
        <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          Kit Rápido
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
          A entrega de kits da sua corrida, <span className="text-primary">rápida e sob controle</span>.
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-base sm:text-lg">
          Importe os inscritos, gere o QR Code de cada atleta e entregue os kits em segundos — com
          estoque, auditoria e relatórios completos, mesmo com internet instável.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">
              Acessar o sistema <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/consulta">Sou atleta — consultar meu kit</Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="shadow-card border-border/70">
              <CardContent className="pt-6">
                <span className="bg-primary/12 text-primary mb-4 grid size-10 place-items-center rounded-xl">
                  <f.icon className="size-5" />
                </span>
                <h2 className="text-base font-bold">{f.title}</h2>
                <p className="text-muted-foreground mt-1 text-sm">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <p className="text-muted-foreground mx-auto max-w-6xl px-4 py-6 text-xs">
          © {new Date().getFullYear()} Kit Rápido — dados pessoais tratados
          conforme a LGPD.
        </p>
      </footer>
    </div>
  );
}
