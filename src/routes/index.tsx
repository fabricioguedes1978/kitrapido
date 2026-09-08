import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ScanLine,
  ShieldCheck,
  PackageCheck,
  Boxes,
  Gauge,
  ArrowRight,
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
    title: "Acompanhe tudo ao vivo",
    text: "Veja entregas por hora, por tamanho e por local em um dashboard que atualiza enquanto acontece.",
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
      <section className="relative overflow-hidden border-b">
        <div className="bg-hero-wash absolute inset-0 -z-10" />
        <div className="mx-auto grid min-h-[680px] min-w-0 max-w-[1440px] items-center gap-12 px-5 pt-10 pb-16 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:px-10 lg:pt-12 xl:px-16">
          <div className="relative z-10 min-w-0 max-w-3xl">
            <span className="border-primary/25 bg-primary/8 text-primary inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold uppercase">
              <PackageCheck className="size-5" /> Entrega de kits sem fila
            </span>
            <h1 className="mt-7 text-5xl leading-[0.98] font-extrabold sm:text-6xl lg:text-7xl">
              A RETIRADA DE KITS DA SUA CORRIDA
            </h1>
            <p className="text-primary mt-1 max-w-2xl text-xl font-semibold leading-relaxed sm:text-2xl">
              MENOS FILA. MAIS AGILIDADE. CONTROLE TOTAL DA ENTREGA.
            </p>
            <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-relaxed sm:text-xl">
              Com o Kit Rápido, seu atleta chega, apresenta o QR Code, é identificado e retira o kit de forma rápida e segura. Enquanto sua equipe atende, você acompanha as entregas, o estoque e toda a operação em tempo real.
            </p>
            <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed sm:text-xl">
              Uma solução criada para corridas que precisam entregar kits com agilidade, organização, eficiência e segurança.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 px-7 text-base shadow-brand">
                <a href="https://wa.me/5531998966300" target="_blank" rel="noopener noreferrer">
                  Quero usar no meu evento <ArrowRight className="size-5" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 border-primary/50 px-7 text-base text-primary">
                <Link to="/checkin">
                  <QrCode className="size-5" /> Sou atleta — check-in pelo CPF
                </Link>
              </Button>
            </div>
            <div className="text-muted-foreground mt-9 grid max-w-2xl grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <span className="flex items-center gap-2 border-r-border sm:border-r">
                <Clock className="text-primary size-6 shrink-0" /> Setup em minutos
              </span>
              <span className="flex items-center gap-2 border-r-border sm:border-r">
                <ShieldCheck className="text-primary size-6 shrink-0" /> Suporte no dia do evento
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="text-primary size-6 shrink-0" /> LGPD compliant
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl pb-10 lg:translate-x-6">
            <div className="bg-primary/15 absolute -inset-6 -z-10 rotate-[-7deg] rounded-[42%_16%_32%_18%]" />
            <div className="bg-sidebar shadow-brand relative ml-auto w-[94%] overflow-hidden rounded-[28px] border-[10px] border-sidebar p-2 sm:w-[88%] sm:border-[14px]">
              <div className="bg-card aspect-[1.48/1] overflow-hidden rounded-xl">
                <div className="grid h-full grid-cols-[29%_71%]">
                  <aside className="bg-sidebar px-3 py-4 text-sidebar-foreground sm:px-5">
                    <Brand inverted className="scale-[0.8] origin-left sm:scale-100" />
                    <div className="mt-7 space-y-2 text-xs sm:text-sm">
                      {["Início", "Entregas", "Atletas", "Estoque", "Relatórios"].map((item, index) => (
                        <div
                          key={item}
                          className={index === 0 ? "bg-primary text-primary-foreground rounded-md px-3 py-2 font-semibold" : "px-3 py-2 opacity-75"}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </aside>
                  <div className="bg-background p-3 sm:p-6">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold sm:text-lg">Central de Entrega</p>
                      <span className="bg-success/10 text-success rounded-full px-2 py-1 text-[9px] font-bold sm:text-xs">● Online</span>
                    </div>
                    <div className="bg-card text-muted-foreground mt-4 rounded-md border px-3 py-2 text-[10px] sm:text-xs">
                      Buscar atleta, CPF ou número...
                    </div>
                    <div className="bg-primary text-primary-foreground mt-3 flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-bold sm:text-sm">
                      <ScanLine className="size-4" /> Ler QR Code
                    </div>
                    <div className="bg-card mt-3 rounded-lg border p-3 shadow-card sm:mt-5 sm:p-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 grid size-9 place-items-center rounded-full sm:size-11"><Users className="text-primary size-5" /></div>
                        <div>
                          <p className="text-xs font-bold sm:text-base">João da Silva</p>
                          <p className="text-success text-[9px] font-semibold sm:text-xs">Inscrição confirmada</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 text-[9px] leading-5 sm:text-xs sm:leading-6">
                        <div><b>Número</b> 1025<br /><b>Modalidade</b> 10 KM<br /><b>Categoria</b> M40-49</div>
                        <div className="text-success">✓ Pagamento confirmado<br />✓ Kit disponível<br />✓ Sem duplicidade</div>
                      </div>
                      <div className="bg-primary text-primary-foreground mt-3 rounded-md py-2 text-center text-[10px] font-bold sm:text-xs">✓ CONFIRMAR ENTREGA</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-sidebar shadow-brand absolute right-0 bottom-0 w-[28%] rotate-3 rounded-[24px] border-[7px] border-sidebar p-1 sm:border-[9px]">
              <div className="bg-card aspect-[0.52/1] rounded-[14px] px-2 py-5 text-center sm:px-4">
                <Brand compact className="mx-auto justify-center" />
                <QrCode className="mx-auto mt-4 size-16 text-foreground sm:size-24" />
                <p className="mt-3 text-[9px] font-extrabold sm:text-sm">JOÃO DA SILVA</p>
                <p className="numeric text-[9px] font-bold sm:text-xs">Nº 1025</p>
                <p className="text-[8px] sm:text-[10px]">10 KM · M40-49</p>
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
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
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
