import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Package,
  Boxes,
  ScanLine,
  MapPin,
  ShieldCheck,
  FileBarChart,
  UserCog,
  History,
  LogOut,
  Menu,
  ClipboardList,
  MonitorSmartphone,
  ImageUp,
  Flag,
  User,
  KeyRound,
  HelpCircle,
  BookOpen,
  ChevronRight,
  AlertCircle,
  Lightbulb,
  MessageCircleQuestion,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brand } from "@/components/Brand";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";
import { ROLE_LABEL, type AppRole } from "@/lib/cronochip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavItem = { to: string; label: string; icon: typeof Users; roles: AppRole[]; sub?: boolean };

const NAV: NavItem[] = [
  { to: "/central", label: "Central de Entrega", icon: ScanLine, roles: ["admin", "organizer", "attendant"] },
  { to: "/eventos", label: "Eventos", icon: CalendarDays, roles: ["admin", "organizer"] },
  { to: "/atletas", label: "Atletas", icon: Users, roles: ["admin", "organizer"] },
  { to: "/usuarios", label: "Usuários", icon: UserCog, roles: ["admin", "organizer"] },
  { to: "/entregas", label: "Entrega", icon: ClipboardList, roles: ["admin", "organizer"] },
  { to: "/estoque", label: "Estoque", icon: Boxes, roles: ["admin", "organizer"] },
  { to: "/relatorios", label: "Relatório", icon: FileBarChart, roles: ["admin", "organizer"] },
  { to: "/auditoria", label: "Auditoria", icon: History, roles: ["admin", "organizer"] },
  { to: "/conferencia", label: "Tela do Atleta", icon: MonitorSmartphone, roles: ["admin", "organizer"] },
  { to: "/tela-atleta", label: "Fundo personalizado", icon: ImageUp, roles: ["admin", "organizer"], sub: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "organizer"] },
  { to: "/locais", label: "Locais de Retirada", icon: MapPin, roles: ["admin", "organizer"] },
  { to: "/alterar-senha", label: "E-mail e Senha", icon: KeyRound, roles: ["admin"] },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((i) => (role ? i.roles.includes(role) : false));

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              item.sub && "border-sidebar-border/60 ml-5 border-l py-2 pl-3 text-[13px]",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-brand"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="bg-dark-gradient flex h-full flex-col gap-6 p-4">
      <Brand inverted />
      <div className="flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate ?? (() => {})} />
      </div>
      <div className="border-sidebar-border space-y-3 border-t pt-4">
        <div className="min-w-0">
          <p className="text-sidebar-foreground truncate text-sm font-semibold">
            {profile?.name || profile?.email || "Usuário"}
          </p>
          <p className="text-sidebar-foreground/60 truncate text-xs">
            {role ? ROLE_LABEL[role] : "Sem perfil"}
          </p>
        </div>
        <Button variant="secondary" size="sm" className="w-full" onClick={() => void signOut()}>
          <LogOut className="size-4" /> Sair
        </Button>
      </div>
    </div>
  );
}

export function EventSelector({ className }: { className?: string }) {
  const { events, eventId, select } = useCurrentEvent();
  const navigate = useNavigate();
  if (events.length === 0) return null;
  const handleSelect = (id: string) => {
    select(id);
    void navigate({ to: "/central" });
  };
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Flag className="text-primary size-4 shrink-0" />
      <Select value={eventId ?? ""} onValueChange={handleSelect}>
        <SelectTrigger className="h-9 w-full max-w-[18rem] border-transparent bg-transparent shadow-none hover:bg-muted/50">
          <SelectValue placeholder="Selecione o evento" />
        </SelectTrigger>
        <SelectContent>
          {events.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type ManualSection = { icon: typeof ScanLine; title: string; steps: string[] };

const MANUAL: Record<AppRole, { title: string; sections: ManualSection[]; tips: string[]; faq: { q: string; a: string }[] }> = {
  attendant: {
    title: "Manual do Staff (Entrega de Kits)",
    sections: [
      {
        icon: ScanLine,
        title: "1. Abrindo a Central de Entrega",
        steps: [
          "No menu lateral, clique em Central de Entrega.",
          "Confirma no topo qual evento está selecionado.",
          "Se estiver offline, o sistema guarda a entrega e sincroniza quando voltar a internet.",
        ],
      },
      {
        icon: Users,
        title: "2. Localizando o atleta",
        steps: [
          "Clique em Ler QR Code e aponte a câmera para o voucher do atleta.",
          "Ou digite o nome, número de peito ou CPF no campo de busca.",
          "Verifique se o atleta exibido é realmente quem está na frente de você.",
        ],
      },
      {
        icon: Package,
        title: "3. Entregando o kit",
        steps: [
          "Confira o número, kit, camiseta e status de pagamento (verde = pago, vermelho = pendente).",
          "Se a retirada for feita por outra pessoa, preencha Quem retirou.",
          "Clique em Entregar Kit para registrar a entrega.",
        ],
      },
      {
        icon: AlertCircle,
        title: "4. Corrigindo um erro",
        steps: [
          "Se entregar para o atleta errado, vá na aba Kit entregue.",
          "Encontre o atleta e clique em Cancelar entrega.",
          "O estoque é restaurado automaticamente e tudo fica registrado na auditoria.",
        ],
      },
    ],
    tips: [
      "Sempre confira o nome e o número antes de clicar em Entregar Kit.",
      "Em caso de dúvida, chame o gerente ou administrador do evento.",
      "O celular do atleta não precisa estar com internet — o QR Code funciona offline.",
    ],
    faq: [
      { q: "Posso entregar kit de atleta com pagamento pendente?", a: "O sistema mostra o aviso em vermelho, mas a entrega pode ser registrada se a organização permitir. Siga a orientação do seu gerente." },
      { q: "E se o QR Code não ler?", a: "Use a busca por nome, número ou CPF. O QR Code é só uma forma mais rápida." },
      { q: "O que acontece se eu cancelar uma entrega?", a: "A entrega é desfeita, o estoque volta e fica registrado quem cancelou." },
    ],
  },
  organizer: {
    title: "Manual do Gerente de Evento",
    sections: [
      {
        icon: CalendarDays,
        title: "1. Escolhendo e configurando o evento",
        steps: [
          "Use o seletor de evento no topo para alternar entre seus eventos.",
          "Em Eventos, complete local, data/horário de largada e informações de retirada de kit.",
          "Adicione o endereço de entrega e o link do Google Maps para os atletas.",
        ],
      },
      {
        icon: Users,
        title: "2. Cadastrando e importando atletas",
        steps: [
          "Em Atletas, cadastre individualmente ou importe a planilha de inscritos.",
          "A importação só funciona se o administrador autorizou no evento.",
          "Número, sexo, data de nascimento e modalidade são obrigatórios.",
          "CPF é opcional, mas, se preenchido, precisa ser válido.",
        ],
      },
      {
        icon: UserCog,
        title: "3. Cadastrando staffs",
        steps: [
          "Em Usuários, adicione staffs informando CPF e nome.",
          "O staff faz login com o CPF e a senha definida por você ou pelo administrador.",
          "Staffs só enxergam a Central de Entrega do evento vinculado.",
        ],
      },
      {
        icon: Boxes,
        title: "4. Acompanhando estoque e entregas",
        steps: [
          "Em Estoque, veja o total, entregues e a entregar por tamanho de camiseta.",
          "Em Entregas, filtre por entregue, pendente ou todos e exporte para Excel.",
          "Use a Tela do Atleta para projetar a conferência em um monitor.",
        ],
      },
    ],
    tips: [
      "Atualize os dados dos atletas com antecedência: 24h antes do evento o cadastro trava.",
      "Padronize os tamanhos de camiseta, modalidade e categoria para facilitar o estoque.",
      "Teste a leitura do QR Code com um atleta antes do dia da entrega.",
    ],
    faq: [
      { q: "Por que não consigo importar planilha?", a: "Verifique se o administrador habilitou a permissão no evento (Permitir importação pelo gerente)." },
      { q: "Posso editar atleta perto do evento?", a: "Não. 24h antes da data do evento, apenas o administrador pode alterar dados." },
      { q: "Como adiciono um staff?", a: "Vá em Usuários → Novo usuário, escolha o perfil Staff e vincule ao evento." },
    ],
  },
  admin: {
    title: "Manual do Administrador",
    sections: [
      {
        icon: CalendarDays,
        title: "1. Criando e gerenciando eventos",
        steps: [
          "Em Eventos, crie o evento com nome, data, local e informações de retirada.",
          "Defina o evento como Ativo (visível a todos) ou Inativo (somente ADM/gerente).",
          "Inative ou exclua eventos antigos sem perder o histórico.",
        ],
      },
      {
        icon: UserCog,
        title: "2. Cadastrando gerentes e staffs",
        steps: [
          "Em Usuários, cadastre gerentes (acesso por CPF e data de nascimento).",
          "Vincule o gerente ao evento para que ele apareça no seletor dele.",
          "Gerentes podem criar eventos próprios e gerenciar atletas deles.",
        ],
      },
      {
        icon: ShieldCheck,
        title: "3. Permissões e segurança",
        steps: [
          "Em cada evento, marque se o gerente pode importar planilha de atletas.",
          "Configure a data/hora de bloqueio de edição (padrão: 24h antes do evento).",
          "Acompanhe todas as ações em Auditoria.",
        ],
      },
      {
        icon: FileBarChart,
        title: "4. Relatórios e monitoramento",
        steps: [
          "Use Dashboard para visão geral em tempo real.",
          "Em Relatórios, exporte listas filtradas por evento, status e perfil.",
          "Em E-mail e Senha, altere suas credenciais de administrador.",
        ],
      },
    ],
    tips: [
      "Sempre crie o evento antes de cadastrar gerentes e atletas.",
      "Faça backup periódico das listas de atletas usando a exportação Excel.",
      "Mantenha o evento inativo até que todos os dados estejam validados.",
    ],
    faq: [
      { q: "Posso recuperar um evento excluído?", a: "Não. A exclusão é definitiva, mas os dados permanecem na auditoria. Prefira inativar." },
      { q: "Como limito o que o gerente faz?", a: "Use as flags do evento: importação pelo gerente e data de bloqueio de edição." },
      { q: "Onde vejo quem entregou kits?", a: "Em Auditoria e na tela Entregas, com filtros por data e usuário." },
    ],
  },
};

function HelpButton() {
  const { role } = useAuth();
  if (!role) return null;
  const info = MANUAL[role];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden shrink-0 gap-2 sm:inline-flex" title="Manual de instruções">
          <BookOpen className="size-4" />
          <span>Manual</span>
        </Button>
      </DialogTrigger>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 sm:hidden" title="Manual de instruções">
          <BookOpen className="size-5" />
          <span className="sr-only">Manual</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="text-primary size-5" />
            {info.title}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="passo" className="w-full">
          <TabsList className="mx-6 grid w-auto grid-cols-3">
            <TabsTrigger value="passo">Passo a passo</TabsTrigger>
            <TabsTrigger value="dicas">Dicas</TabsTrigger>
            <TabsTrigger value="faq">Dúvidas</TabsTrigger>
          </TabsList>
          <ScrollArea className="max-h-[60vh]">
            <TabsContent value="passo" className="px-6 pb-6 pt-2">
              <Accordion type="single" collapsible defaultValue="section-0" className="w-full">
                {info.sections.map((section, idx) => (
                  <AccordionItem key={section.title} value={`section-${idx}`}>
                    <AccordionTrigger className="text-left text-sm hover:no-underline">
                      <span className="flex items-center gap-2">
                        <section.icon className="text-primary size-4 shrink-0" />
                        {section.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ol className="space-y-2 pl-6 text-sm text-muted-foreground">
                        {section.steps.map((step, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-2">
                            <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
            <TabsContent value="dicas" className="px-6 pb-6 pt-2">
              <ul className="space-y-3">
                {info.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="faq" className="px-6 pb-6 pt-2">
              <Accordion type="single" collapsible className="w-full">
                {info.faq.map((item, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`}>
                    <AccordionTrigger className="text-left text-sm hover:no-underline">
                      <span className="flex items-center gap-2">
                        <MessageCircleQuestion className="text-primary size-4 shrink-0" />
                        {item.q}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="pl-6 text-sm text-muted-foreground">{item.a}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function UserAvatar() {
  const { profile, role } = useAuth();
  const initials = (profile?.name || profile?.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-sm font-semibold leading-tight">
          {profile?.name || profile?.email || "Usuário"}
        </p>
        <p className="text-muted-foreground truncate text-xs leading-tight">
          {role ? ROLE_LABEL[role] : "Sem perfil"}
        </p>
      </div>
      <Avatar className="size-9 border-2 border-primary/20">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
          {initials || <User className="size-4" />}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-background min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden lg:block lg:h-screen lg:sticky lg:top-0">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="bg-card/90 sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-2.5 backdrop-blur lg:grid-cols-[minmax(0,1fr)_auto]">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <EventSelector />
          </div>
          <div className="flex items-center gap-3">
            <HelpButton />
            <OnlineIndicator className="shrink-0" />
            <UserAvatar />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="text-muted-foreground truncate text-sm">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
