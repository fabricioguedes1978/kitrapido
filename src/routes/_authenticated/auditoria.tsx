import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEvent } from "@/hooks/useEvents";
import { formatDateTime } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — Kit Fácil" },
      { name: "description", content: "Registro de todas as ações realizadas na operação de entrega." },
      { property: "og:title", content: "Auditoria — Kit Fácil" },
      { property: "og:description", content: "Rastreabilidade completa de quem fez o quê e quando." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auditoria,
});

function Auditoria() {
  const { event, eventId } = useCurrentEvent();

  const { data: logs = [] } = useQuery({
    queryKey: ["audit", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id,user_name,action,entity,created_at")
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <PageHeader title="Auditoria" subtitle={event?.name ?? ""} />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="numeric whitespace-nowrap">{formatDateTime(l.created_at)}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{l.user_name ?? "—"}</TableCell>
                  <TableCell>{l.action}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    Nenhum registro de auditoria para este evento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
