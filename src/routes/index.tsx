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
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:py-5">
        <Brand compact className="sm:hidden" />
        <Brand className="hidden sm:flex" />
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="border-primary/50 text-primary h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm">
            <Link to="/checkin">
              <QrCode className="size-4" /> <span className="hidden sm:inline">Check-in do atleta</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="shadow-brand h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="bg-hero-wash absolute inset-0 -z-10" />
        <div className="mx-auto grid min-h-[auto] min-w-0 max-w-[1440px] items-center gap-8 px-4 pt-6 pb-10 sm:px-5 sm:pt-10 sm:pb-16 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:min-h-[680px] lg:gap-12 lg:px-10 lg:pt-12 xl:px-16">
          <div className="relative z-10 min-w-0 max-w-3xl">
            <Link
              to="/checkin"
              className="border-primary/25 bg-primary/8 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase transition-colors hover:bg-primary/15 sm:px-4 sm:py-2 sm:text-sm"
            >
              <QrCode className="size-4 sm:size-5" /> Atleta, clique aqui e faça seu check-in
            </Link>
            <h1 className="mt-4 text-3xl leading-[1.05] font-extrabold sm:mt-7 sm:text-5xl sm:leading-[0.98] lg:text-7xl">
              A RETIRADA DE KITS DA SUA CORRIDA
            </h1>
            <p className="text-primary mt-1 max-w-2xl text-base font-semibold leading-relaxed sm:text-xl sm:text-2xl">
              MENOS FILA. MAIS AGILIDADE. CONTROLE TOTAL DA ENTREGA.
            </p>
            <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-relaxed sm:mt-5 sm:text-lg sm:text-xl">
              Com o Kit Rápido, seu atleta chega, apresenta o QR Code, é identificado e retira o kit de forma rápida e segura. Enquanto sua equipe atende, você acompanha as entregas, o estoque e toda a operação em tempo real.
            </p>
            <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-relaxed sm:text-lg sm:text-xl">
              Uma solução criada para corridas que precisam entregar kits com agilidade, organização, eficiência e segurança.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
              <Button asChild size="lg" className="shadow-brand h-11 px-5 text-sm sm:h-14 sm:px-7 sm:text-base">
                <a href="https://wa.me/5531998966300" target="_blank" rel="noopener noreferrer">
                  Quero usar no meu evento <ArrowRight className="size-4 sm:size-5" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 border-primary/50 px-5 text-sm text-primary sm:h-14 sm:px-7 sm:text-base">
                <Link to="/checkin">
                  <QrCode className="size-4 sm:size-5" /> Sou atleta — check-in pelo CPF
                </Link>
              </Button>
            </div>
            <div className="text-muted-foreground mt-6 grid max-w-2xl grid-cols-1 gap-3 text-sm sm:mt-9 sm:grid-cols-2 sm:gap-4">
              <span className="flex items-center gap-2 border-r-border sm:border-r">
                <Clock className="text-primary size-5 shrink-0 sm:size-6" /> Setup em minutos
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="text-primary size-5 shrink-0 sm:size-6" /> LGPD compliant
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[260px] pb-6 sm:max-w-lg sm:pb-10 lg:max-w-xl lg:translate-x-0">
            <div className="bg-primary/15 absolute -inset-4 -z-10 rotate-[-7deg] rounded-[42%_16%_32%_18%] sm:-inset-6" />
            <div className="bg-sidebar shadow-brand relative mx-auto w-[72%] overflow-hidden rounded-[20px] border-[7px] border-sidebar p-1.5 sm:w-[72%] sm:rounded-[28px] sm:border-[14px] sm:p-2">
              <div className="bg-card aspect-[1.48/1] overflow-hidden rounded-lg sm:rounded-xl">
                <div className="grid h-full grid-cols-[26%_74%] sm:grid-cols-[29%_71%]">
                  <aside className="bg-sidebar px-2 py-3 text-sidebar-foreground sm:px-5 sm:py-4">
                    <Brand inverted className="scale-[0.65] origin-left sm:scale-100" />
                    <div className="mt-4 space-y-1 text-[9px] sm:mt-7 sm:space-y-2 sm:text-sm">
                      {["Início", "Entregas", "Atletas", "Estoque", "Relatórios"].map((item, index) => (
                        <div
                          key={item}
                          className={index === 0 ? "bg-primary text-primary-foreground rounded-md px-2 py-1.5 font-semibold sm:px-3 sm:py-2" : "px-2 py-1.5 opacity-75 sm:px-3 sm:py-2"}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </aside>
                  <div className="bg-background p-2 sm:p-6">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold sm:text-lg">Central de Entrega</p>
                      <span className="bg-success/10 text-success rounded-full px-1.5 py-0.5 text-[8px] font-bold sm:px-2 sm:py-1 sm:text-xs">● Online</span>
                    </div>
                    <div className="bg-card text-muted-foreground mt-2 rounded-md border px-2 py-1.5 text-[9px] sm:mt-4 sm:px-3 sm:py-2 sm:text-xs">
                      Buscar atleta, CPF ou número...
                    </div>
                    <div className="bg-primary text-primary-foreground mt-2 flex items-center justify-center gap-2 rounded-md py-1.5 text-[10px] font-bold sm:mt-3 sm:py-2.5 sm:text-sm">
                      <ScanLine className="size-3 sm:size-4" /> Ler QR Code
                    </div>
                    <div className="bg-card mt-2 rounded-lg border p-2 shadow-card sm:mt-5 sm:p-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-primary/10 grid size-7 place-items-center rounded-full sm:size-11"><Users className="text-primary size-3.5 sm:size-5" /></div>
                        <div>
                          <p className="text-[10px] font-bold sm:text-base">João da Silva</p>
                          <p className="text-success text-[8px] font-semibold sm:text-xs">Inscrição confirmada</p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-2 text-[8px] leading-4 sm:mt-3 sm:gap-x-3 sm:text-xs sm:leading-6">
                        <div><b>Número</b> 1025<br /><b>Modalidade</b> 10 KM<br /><b>Categoria</b> M40-49</div>
                        <div className="text-success">✓ Pagamento confirmado<br />✓ Kit disponível<br />✓ Sem duplicidade</div>
                      </div>
                      <div className="bg-primary text-primary-foreground mt-2 rounded-md py-1.5 text-center text-[9px] font-bold sm:mt-3 sm:py-2 sm:text-xs">✓ CONFIRMAR ENTREGA</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-sidebar shadow-brand absolute right-2 bottom-0 w-[18%] rotate-3 rounded-[18px] border-[5px] border-sidebar p-1 sm:right-3 sm:w-[22%] sm:rounded-[24px] sm:border-[9px]">
              <div className="bg-card aspect-[0.52/1] rounded-[10px] px-1.5 py-3 text-center sm:rounded-[14px] sm:px-4 sm:py-5">
                <Brand compact className="mx-auto justify-center scale-75 sm:scale-100" />
                <QrCode className="mx-auto mt-2 size-10 text-foreground sm:mt-4 sm:size-24" />
                <p className="mt-2 text-[8px] font-extrabold sm:mt-3 sm:text-sm">JOÃO DA SILVA</p>
                <p className="numeric text-[8px] font-bold sm:text-xs">Nº 1025</p>
                <p className="text-[7px] sm:text-[10px]">10 KM · M40-49</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y bg-card/50 py-5 sm:py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-5 px-4 text-center text-sm text-muted-foreground sm:justify-between sm:text-left">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-primary text-xl font-extrabold sm:text-2xl">100%</span>
            <span>rastreabilidade das entregas</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-primary text-xl font-extrabold sm:text-2xl">0</span>
            <span>duplicidade na retirada</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-primary text-xs font-semibold uppercase tracking-wide">
            Por que escolher o Kit Rápido
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
            Tudo que você precisa para entregar kits sem dor de cabeça
          </h2>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            Uma plataforma completa pensada para organizadores de corridas e eventos esportivos.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {FEATURES.map((f) => (
            <Card key={f.title} className="shadow-card border-border/70 transition-shadow hover:shadow-lg">
              <CardContent className="pt-5 sm:pt-6">
                <span className="bg-primary/10 text-primary mb-3 grid size-10 place-items-center rounded-xl sm:mb-4 sm:size-11">
                  <f.icon className="size-4 sm:size-5" />
                </span>
                <h3 className="text-base font-bold sm:text-lg">{f.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/50 py-12 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-primary text-xs font-semibold uppercase tracking-wide">Como funciona</span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
              Do cadastro à entrega em 3 passos
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((s) => (
              <div key={s.step} className="bg-card shadow-card relative rounded-2xl border p-5 sm:p-6">
                <span className="bg-primary text-primary-foreground absolute -top-3 left-6 flex size-7 items-center justify-center rounded-full text-xs font-extrabold sm:size-8 sm:text-sm">
                  {s.step}
                </span>
                <s.icon className="text-primary mt-3 size-7 sm:mt-4 sm:size-8" />
                <h3 className="mt-3 text-base font-bold sm:text-lg">{s.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-24">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="text-primary text-xs font-semibold uppercase tracking-wide">Benefícios</span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
              Organize a entrega de kits como um profissional
            </h2>
            <p className="text-muted-foreground mt-4 text-sm sm:text-lg">
              Menos filas, menos erros e mais satisfação dos atletas. O Kit Rápido foi feito para
              quem quer entregar muitos kits em pouco tempo, sem perder o controle.
            </p>
            <div className="mt-6 sm:mt-8">
              <Button asChild size="lg" className="shadow-brand h-11 px-5 text-sm sm:h-12 sm:px-6 sm:text-base">
                <Link to="/auth">
                  Começar agora <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="bg-card rounded-xl border p-4 sm:p-5">
                <b.icon className="text-primary size-5 sm:size-6" />
                <h3 className="mt-3 text-sm font-bold sm:text-base">{b.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-24">
        <div className="bg-dark-gradient relative overflow-hidden rounded-2xl px-5 py-10 text-center text-white sm:rounded-3xl sm:px-12 sm:py-20">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              Pronto para acelerar a entrega de kits no seu evento?
            </h2>
            <p className="mt-4 text-sm text-white/80 sm:text-base">
              Entre em contato e descubra como o Kit Rápido pode transformar a experiência dos seus atletas.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8">
              <Button asChild size="lg" variant="secondary" className="h-11 px-5 text-sm sm:h-12 sm:px-6 sm:text-base">
                <Link to="/auth">Acessar o sistema</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 border-white/30 bg-transparent px-5 text-sm text-white hover:bg-white/10 hover:text-white sm:h-12 sm:px-6 sm:text-base"
              >
                <Link to="/checkin">Check-in do atleta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:py-8 sm:text-left">
          <Brand compact className="scale-90 sm:scale-100" />
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Kit Rápido — dados pessoais tratados conforme a LGPD.
          </p>
        </div>
      </footer>
    </div>
  );
}
