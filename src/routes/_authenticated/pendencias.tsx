import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";
import { fetchAllRows } from "@/lib/fetch-all";
import { formatDateTime } from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/pendencias")({
  head: () => ({ meta: [
    { title: "Pendências — Kit Rápido" }, { name: "description", content: "Solicitações de correção de dados dos atletas por evento." },
    { property: "og:title", content: "Pendências — Kit Rápido" }, { property: "og:description", content: "Acompanhe pendências e correções resolvidas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }), component: Pendencias,
});
type Request = Database["public"]["Tables"]["athlete_correction_requests"]["Row"];
type Athlete = Database["public"]["Tables"]["athletes"]["Row"];
const fields = [
  ["name", "Nome"], ["birth_date", "Nascimento"], ["equipe", "Equipe"], ["gender", "Sexo"], ["city", "Cidade"],
  ["modality", "Modalidade"], ["category", "Categoria"], ["phone", "Telefone"], ["email", "E-mail"],
] as const;

function Pendencias() {
  const { isAdmin, isOrganizer } = useAuth();
  const { event, eventId } = useCurrentEvent();
  const qc = useQueryClient();
  const allowed = isAdmin || isOrganizer;
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ request: Request; athlete: Athlete } | null>(null);
  const [form, setForm] = useState<Record<string, string>>( {} );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const { data: rows = [], isPending, isError, refetch } = useQuery({ queryKey: ["correction-requests", eventId], enabled: allowed && !!eventId,
    queryFn: async () => {
      if (!eventId) return [];
      return fetchAllRows<Request & { athletes: { name: string; bib_number: string | null } | null }>(() => supabase.from("athlete_correction_requests").select("*,athletes(name,bib_number)").eq("event_id", eventId).order("created_at", { ascending: false }));
    }, refetchInterval: 30000,
  });
  const extras = (event?.custom_field_labels ?? []).map((label, index) => [`custom_${index + 1}`, label] as const).filter(([,label]) => label);
  const editFields = [...fields, ...extras];
  async function openCorrection(request: Request) {
    setOpening(request.id);
    try {
      const { data, error } = await supabase.from("athletes").select("*").eq("id", request.athlete_id).eq("event_id", request.event_id).single();
      if (error || !data) throw error;
      const values: Record<string, string> = {};
      for (const [key] of editFields) values[key] = String(data[key as keyof Athlete] ?? "");
      setForm(values); setNote(""); setEditing({ request, athlete: data });
    } catch { toast.error("Não foi possível carregar os dados do atleta."); }
    finally { setOpening(null); }
  }
  async function resolve() {
    if (!editing || saving) return;
    const changes: Record<string, string> = {};
    for (const [key] of editFields) {
      const value = (form[key] ?? "").trim();
      if (value !== String(editing.athlete[key as keyof Athlete] ?? "")) changes[key] = value;
    }
    if (!form["name"]?.trim()) { toast.error("Informe o nome do atleta."); return; }
    if (["birth_date", "modality", "category"].some((key) => !form[key]?.trim())) { toast.error("Preencha data de nascimento, modalidade e categoria."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("resolve_athlete_correction", { _request_id: editing.request.id, _changes: changes, _note: note.trim() });
      if (error) throw error;
      await Promise.all([qc.invalidateQueries({ queryKey: ["correction-requests", eventId] }), qc.invalidateQueries({ queryKey: ["athletes", eventId] })]);
      setEditing(null); toast.success("Pendência resolvida. Dados salvos.");
    } catch { toast.error("Não foi possível resolver. Confira os dados e tente novamente."); }
    finally { setSaving(false); }
  }
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visible = rows.filter((row) => row.status === tab && normalize(`${row.athletes?.name ?? ""} ${row.athletes?.bib_number ?? ""} ${row.observation} ${row.requested_by_name}`).includes(normalize(search)));
  return <AppShell><PageHeader title="Pendências" subtitle={event?.name ?? ""} />
    {!allowed ? <p className="text-muted-foreground">Acesso disponível para gerente e administrador.</p> : !eventId ? <p>Selecione um evento.</p> : <>
      <div className="grid grid-cols-2 gap-4 border-y py-5 mb-6">
        <div><p className="text-muted-foreground flex items-center gap-2"><ClipboardList className="size-4" /> Pendências</p><p className="text-warning text-3xl font-bold">{rows.filter((r) => r.status === "pending").length}</p></div>
        <div><p className="text-muted-foreground flex items-center gap-2"><CheckCircle2 className="size-4" /> Resolvidas</p><p className="text-success text-3xl font-bold">{rows.filter((r) => r.status === "resolved").length}</p></div>
      </div>
      <div className="flex flex-wrap gap-3 mb-5"><Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="pending">Pendências</TabsTrigger><TabsTrigger value="resolved">Resolvidas</TabsTrigger></TabsList></Tabs><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Buscar pendências" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Atleta, número, observação ou solicitante" /></div></div>
      {isPending ? <p>Carregando…</p> : isError ? <div><p className="text-destructive">Não foi possível carregar as pendências.</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div> : visible.length === 0 ? <p className="text-muted-foreground">{search ? "Nenhuma solicitação encontrada." : tab === "pending" ? "Nenhuma pendência neste evento." : "Nenhuma pendência resolvida neste evento."}</p> : <div className="divide-y">
        {visible.map((row) => <article key={row.id} className="py-5 space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-bold break-words">{row.athletes?.name ?? "Atleta"} {row.athletes?.bib_number ? `· Nº ${row.athletes.bib_number}` : ""}</h2><p className="text-muted-foreground text-sm">{row.requested_by_name} · {formatDateTime(row.created_at)}</p></div>{row.status === "pending" && <Button variant="outline" disabled={opening !== null} onClick={() => void openCorrection(row)}>{opening === row.id ? "Abrindo…" : "Corrigir / resolver"}</Button>}</div><p className="whitespace-pre-wrap break-words">{row.observation}</p>{row.status === "resolved" && <div className="text-sm"><p className="text-success font-semibold">Resolvida por {row.resolved_by_name} · {formatDateTime(row.resolved_at)}</p>{row.resolution_note && <p className="mt-1 whitespace-pre-wrap break-words">{row.resolution_note}</p>}</div>}</article>)}
      </div>}
    </>}
    <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !saving) setEditing(null); }}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Corrigir / resolver pendência</DialogTitle><DialogDescription className="whitespace-pre-wrap break-words">{editing?.request.observation}</DialogDescription></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); void resolve(); }} className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{editFields.map(([key,label]) => <div key={key} className="space-y-1.5"><Label htmlFor={`correction-${key}`}>{label}</Label><Input id={`correction-${key}`} type={key === "birth_date" ? "date" : "text"} required={["name", "birth_date", "modality", "category"].includes(key)} maxLength={500} value={form[key] ?? ""} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} /></div>)}</div>
        <div className="space-y-1.5"><Label htmlFor="resolution-note">Observação da resolução</Label><Textarea id="resolution-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} /></div>
        <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar e marcar como resolvida"}</Button></DialogFooter>
      </form></DialogContent></Dialog>
  </AppShell>;
}