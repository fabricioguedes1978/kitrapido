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
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  { to: "/conferencia", label: "Tela do Atleta", icon: MonitorSmartphone, roles: ["admin", "organizer"] },
  { to: "/tela-atleta", label: "Fundo personalizado", icon: ImageUp, roles: ["admin", "organizer"], sub: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "organizer"] },
  { to: "/eventos", label: "Eventos", icon: CalendarDays, roles: ["admin", "organizer"] },
  { to: "/atletas", label: "Atletas", icon: Users, roles: ["admin", "organizer"] },
  { to: "/estoque", label: "Estoque", icon: Boxes, roles: ["admin", "organizer"] },
  { to: "/entregas", label: "Entregas", icon: ClipboardList, roles: ["admin", "organizer"] },
  { to: "/locais", label: "Locais de Retirada", icon: MapPin, roles: ["admin", "organizer"] },
  { to: "/autorizacoes", label: "Autorizações", icon: ShieldCheck, roles: ["admin", "organizer"] },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, roles: ["admin", "organizer"] },
  { to: "/usuarios", label: "Usuários", icon: UserCog, roles: ["admin", "organizer"] },
  { to: "/auditoria", label: "Auditoria", icon: History, roles: ["admin", "organizer"] },
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

const INSTRUCTIONS: Record<AppRole, { title: string; items: string[] }> = {
  attendant: {
    title: "Instruções para Staff",
    items: [
      "Acesse a Central de Entrega pelo menu lateral.",
      "Leia o QR Code do atleta com o botão de leitura, ou pesquise por nome, número ou CPF.",
      "Confira os dados do atleta na tela: número, kit, camiseta e status de pagamento.",
      "Clique em \"Entregar Kit\" para dar baixa. Se for retirada por terceiros, informe o nome de quem retirou.",
      "Se entregar para o atleta errado, use \"Cancelar entrega\" na área de kit entregue para desfazer.",
      "O seletor de evento no topo define em qual evento você está trabalhando.",
    ],
  },
  organizer: {
    title: "Instruções para Gerente",
    items: [
      "Use o seletor de evento no topo para escolher o evento que deseja gerenciar.",
      "Em Atletas, cadastre, edite ou importe a planilha de inscritos (quando autorizado pelo administrador).",
      "Em Central de Entrega, acompanhe e realize as entregas de kits.",
      "Em Entregas, filtre por entregues, pendentes ou todos, e exporte para Excel.",
      "Em Estoque, acompanhe automaticamente o total, entregues e a entregar por tamanho de camiseta.",
      "Em Usuários, cadastre os staffs do seu evento (acesso por CPF).",
      "Atenção: edições de atletas são bloqueadas 24h antes do evento.",
    ],
  },
  admin: {
    title: "Instruções para Administrador",
    items: [
      "Crie e gerencie eventos em Eventos; você pode inativar ou excluir eventos.",
      "Use o seletor de evento no topo para alternar entre os eventos.",
      "Cadastre gerentes em Usuários e vincule-os aos eventos (acesso por CPF e data de nascimento).",
      "Defina em cada evento se o gerente pode importar a planilha de inscritos.",
      "Acompanhe tudo pelo Dashboard, Relatórios e Auditoria.",
      "Em E-mail e Senha, altere suas credenciais de acesso.",
    ],
  },
};

function HelpButton() {
  const { role } = useAuth();
  if (!role) return null;
  const info = INSTRUCTIONS[role];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0" title="Instruções de uso">
          <HelpCircle className="size-5" />
          <span className="sr-only">Instruções de uso</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{info.title}</DialogTitle>
        </DialogHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {info.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
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
