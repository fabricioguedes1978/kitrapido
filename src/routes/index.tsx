import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ScanLine,
  ShieldCheck,
  Boxes,
  Gauge,
  ArrowRight,
  Play,
  Zap,
  Users,
  Smartphone,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  BarChart3,
  QrCode,
  WifiOff,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kit Rápido — Entrega de kits de corrida sem fila" },
      {
        name: "description",
        content:
          "Elimine filas na entrega de kits com QR Code, controle de estoque em tempo real, relatórios e modo offline. Ideal para corridas, maratonas e eventos esportivos.",
      },
      { property: "og:title", content: "Kit Rápido — Entrega de kits de corrida sem fila" },
      {
        property: "og:description",
        content:
          "QR Code, estoque, relatórios e controle total. A forma mais rápida de entregar kits em eventos esportivos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: ScanLine,
    title: "Retirada por QR Code",
    text: "O atleta apresenta o QR Code, a equipe escaneia e entrega em segundos. Sem digitar, sem erros.",
  },
  {
    icon: ShieldCheck,
    title: "Zero duplicidade",
    text: "Bloqueio automático de segunda entrega. Cada kit só é entregue uma vez, com rastreio completo.",
  },
  {
    icon: Boxes,
    title: "Estoque em tempo real",
    text: "Baixa automática de camisetas por tamanho. Alerta quando um item está acabando.",
  },
  {
    icon: Gauge,
    title: "Dashboard ao vivo",
    text: "Acompanhe entregas por hora, por tamanho, por atendente e por local. Toma decisões na hora.",
  },
  {
    icon: WifiOff,
    title: "Funciona offline",
    text: "Internet instável no local? O sistema continua entregando e sincroniza quando voltar a conexão.",
  },
  {
    icon: FileSpreadsheet,
    title: "Importação fácil",
    text: "Suba sua planilha de inscritos em CSV ou Excel e comece a entregar em minutos.",
  },
];

const STEPS = [
  {
    icon: FileSpreadsheet,
    step: "1",
    title: "Importe os inscritos",
    text: "Envie a planilha com nome, CPF, número de peito, tamanho de camiseta e dados do evento.",
  },
  {
    icon: QrCode,
    step: "2",
    title: "Gere as credenciais",
    text: "Cada atleta recebe um QR Code pessoal para apresentar na retirada do kit.",
  },
  {
    icon: ScanLine,
    step: "3",
    title: "Entregue com um scan",
    text: "A equipe lê o QR Code, confere os dados na tela e confirma a entrega em um toque.",
  },
];

const BENEFITS = [
  { icon: Clock, title: "Mais velocidade", text: "Reduza filas e agilize a entrega nos dias de evento." },
  { icon: CheckCircle2, title: "Mais segurança", text: "Evite fraudes, duplicidades e extravio de kits." },
  { icon: BarChart3, title: "Mais controle", text: "Relatórios completos para auditoria e planejamento." },
  { icon: Users, title: "Mais equipe", text: "Gerentes e staffs com acessos separados e rastreáveis." },
  { icon: Smartphone, title: "Multi-dispositivo", text: "Use celular, tablet ou computador no local de retirada." },
  { icon: Zap, title: "Pronto em minutos", text: "Configure o evento, importe os dados e comece a usar." },
];

function Landing() {
  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
        <Brand />
        <Button asChild size="sm" className="shadow-brand">
          <Link to="/auth">Entrar no sistema</Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/30" />
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-20 sm:pt-16 sm:pb-28">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                Entrega de kits sem fila
              </span>
              <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                A retirada de kits da sua corrida,{" "}
                <span className="text-primary">rápida e sob controle</span>.
              </h1>
              <p className="text-muted-foreground mt-5 max-w-xl text-base sm:text-lg">
                QR Code, estoque em tempo real, bloqueio de duplicidade e relatórios completos.
                Tudo no celular, tablet ou computador — mesmo com internet instável.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="shadow-brand">
                  <Link to="/auth">
                    Quero usar no meu evento <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/checkin">Sou atleta — check-in pelo CPF</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="text-primary size-4" /> Setup em minutos
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="text-primary size-4" /> Suporte no dia do evento
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="text-primary size-4" /> LGPD compliant
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-full">
              <div className="bg-card shadow-card relative overflow-hidden rounded-3xl border p-6 sm:p-8">
                <div className="bg-brand-gradient absolute top-0 right-0 left-0 h-2" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                      Evento ao vivo
                    </p>
                    <p className="text-2xl font-bold">Corrida das Nações 2026</p>
                  </div>
                  <span className="bg-success/10 text-success rounded-full px-2.5 py-1 text-xs font-semibold">
                    Online
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-xl p-4">
                    <p className="text-muted-foreground text-xs uppercase">Entregues</p>
                    <p className="numeric text-2xl font-extrabold text-primary">1.248</p>
                  </div>
                  <div className="bg-muted rounded-xl p-4">
                    <p className="text-muted-foreground text-xs uppercase">Pendentes</p>
                    <p className="numeric text-2xl font-extrabold">312</p>
                  </div>
                  <div className="bg-muted rounded-xl p-4">
                    <p className="text-muted-foreground text-xs uppercase">Última hora</p>
                    <p className="numeric text-2xl font-extrabold">86</p>
                  </div>
                  <div className="bg-muted rounded-xl p-4">
                    <p className="text-muted-foreground text-xs uppercase">Estoque alerta</p>
                    <p className="numeric text-2xl font-extrabold text-warning">M</p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed p-4">
                  <div className="bg-primary/10 grid size-12 shrink-0 place-items-center rounded-lg">
                    <QrCode className="text-primary size-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">João Silva · #4521</p>
                    <p className="text-muted-foreground truncate text-xs">
                      Kit entregue · 10:42 · Staff Maria
                    </p>
                  </div>
                  <CheckCircle2 className="text-success ml-auto size-5 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y bg-card/50 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-4 text-center text-sm text-muted-foreground sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <span className="text-primary text-2xl font-extrabold">3.000+</span>
            <span>atletas já passaram pelo Kit Rápido</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-primary text-2xl font-extrabold">100%</span>
            <span>rastreabilidade das entregas</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-primary text-2xl font-extrabold">0</span>
            <span>duplicidade na retirada</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-primary text-xs font-semibold uppercase tracking-wide">
            Por que escolher o Kit Rápido
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Tudo que você precisa para entregar kits sem dor de cabeça
          </h2>
          <p className="text-muted-foreground mt-3">
            Uma plataforma completa pensada para organizadores de corridas e eventos esportivos.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="shadow-card border-border/70 transition-shadow hover:shadow-lg">
              <CardContent className="pt-6">
                <span className="bg-primary/10 text-primary mb-4 grid size-11 place-items-center rounded-xl">
                  <f.icon className="size-5" />
                </span>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-primary text-xs font-semibold uppercase tracking-wide">Como funciona</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Do cadastro à entrega em 3 passos
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="bg-card shadow-card relative rounded-2xl border p-6">
                <span className="bg-primary text-primary-foreground absolute -top-3 left-6 flex size-8 items-center justify-center rounded-full text-sm font-extrabold">
                  {s.step}
                </span>
                <s.icon className="text-primary mt-4 size-8" />
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <span className="text-primary text-xs font-semibold uppercase tracking-wide">Benefícios</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Organize a entrega de kits como um profissional
            </h2>
            <p className="text-muted-foreground mt-4 text-base sm:text-lg">
              Menos filas, menos erros e mais satisfação dos atletas. O Kit Rápido foi feito para
              quem quer entregar muitos kits em pouco tempo, sem perder o controle.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="shadow-brand">
                <Link to="/auth">
                  Começar agora <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title} className="bg-card rounded-xl border p-5">
                <b.icon className="text-primary size-6" />
                <h3 className="mt-3 font-bold">{b.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
        <div className="bg-dark-gradient relative overflow-hidden rounded-3xl px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Pronto para acelerar a entrega de kits no seu evento?
            </h2>
            <p className="mt-4 text-white/80">
              Entre em contato e descubra como o Kit Rápido pode transformar a experiência dos seus atletas.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">Acessar o sistema</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/checkin">Check-in do atleta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <Brand compact />
          <p className="text-muted-foreground text-center text-xs sm:text-left">
            © {new Date().getFullYear()} Kit Rápido — dados pessoais tratados conforme a LGPD.
          </p>
        </div>
      </footer>
    </div>
  );
}
