import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEvent } from "@/hooks/useEvents";
import { formatDateTime } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — Kit Rápido" },
      { name: "description", content: "Registro de todas as ações realizadas na operação de entrega." },
      { property: "og:title", content: "Auditoria — Kit Rápido" },
      { property: "og:description", content: "Rastreabilidade completa de quem fez o quê e quando." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auditoria,
});

function Auditoria() {
  const { event, eventId } = useCurrentEvent();
  const [term, setTerm] = useState("");

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

  const filteredLogs = useMemo(() => {
    const query = term
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");

    if (!query) return logs;

    return logs.filter((log) =>
      [log.user_name, log.action].some((value) =>
        (value ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .includes(query),
      ),
    );
  }, [logs, term]);

  return (
    <AppShell>
      <PageHeader title="Auditoria" subtitle={event?.name ?? ""} />
      <Input
        type="search"
        placeholder="Buscar por usuário ou ação"
        aria-label="Buscar registros de auditoria"
        className="mb-4 h-12"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
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
              {filteredLogs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="numeric whitespace-nowrap">{formatDateTime(l.created_at)}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{l.user_name ?? "—"}</TableCell>
                  <TableCell>{l.action}</TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    {term.trim()
                      ? "Nenhum registro encontrado para esta busca."
                      : "Nenhum registro de auditoria para este evento."}
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
