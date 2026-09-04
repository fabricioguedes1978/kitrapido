import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Download, Plus, QrCode, Upload } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";
import {
  KIT_STATUS,
  downloadBlob,
  logAudit,
  maskCPF,
  onlyDigits,
  qrPayload,
} from "@/lib/cronochip";

export const Route = createFileRoute("/_authenticated/atletas")({
  head: () => ({
    meta: [
      { title: "Atletas — Cronochip Kit" },
      { name: "description", content: "Importe, cadastre e acompanhe os atletas inscritos no evento." },
      { property: "og:title", content: "Atletas — Cronochip Kit" },
      { property: "og:description", content: "Base de inscritos com importação de CSV e Excel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Atletas,
});

type Athlete = {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  registration_number: string | null;
  bib_number: string | null;
  modality: string | null;
  category: string | null;
  shirt_size: string | null;
  kit_type: string | null;
  kit_status: string;
};

const COLUMN_MAP: Record<string, keyof Athlete | "distance"> = {
  nome: "name",
  atleta: "name",
  cpf: "cpf",
  email: "email",
  "e-mail": "email",
  telefone: "phone",
  celular: "phone",
  inscricao: "registration_number",
  "numero de inscricao": "registration_number",
  peito: "bib_number",
  "numero de peito": "bib_number",
  numero: "bib_number",
  modalidade: "modality",
  categoria: "category",
  distancia: "distance",
  camiseta: "shirt_size",
  tamanho: "shirt_size",
  kit: "kit_type",
};

function normalizeKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function Atletas() {
  const { event, eventId } = useCurrentEvent();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const [qrAthlete, setQrAthlete] = useState<Athlete | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", cpf: "", bib_number: "", modality: "", shirt_size: "" });

  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ["athletes", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(
          "id,name,cpf,email,phone,registration_number,bib_number,modality,category,shirt_size,kit_type,kit_status",
        )
        .eq("event_id", eventId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Athlete[];
    },
  });

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return athletes.slice(0, 300);
    const digits = onlyDigits(q);
    return athletes
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.bib_number ?? "").includes(q) ||
          (a.registration_number ?? "").toLowerCase().includes(q) ||
          (digits.length >= 3 && onlyDigits(a.cpf).includes(digits)),
      )
      .slice(0, 300);
  }, [athletes, term]);

  async function importRows(rows: Record<string, unknown>[]) {
    if (!eventId) return;
    const parsed = rows
      .map((row) => {
        const out: Record<string, string | null> = {};
        Object.entries(row).forEach(([key, value]) => {
          const mapped = COLUMN_MAP[normalizeKey(key)];
          if (mapped) out[mapped] = value == null || value === "" ? null : String(value).trim();
        });
        return out;
      })
      .filter((r) => r["name"])
      .map((r) => ({
        event_id: eventId,
        name: r["name"]!,
        cpf: r["cpf"] ? onlyDigits(r["cpf"]) : null,
        email: r["email"] ?? null,
        phone: r["phone"] ?? null,
        registration_number: r["registration_number"] ?? null,
        bib_number: r["bib_number"] ?? null,
        modality: r["modality"] ?? null,
        category: r["category"] ?? null,
        distance: r["distance"] ?? null,
        shirt_size: r["shirt_size"] ? r["shirt_size"].toUpperCase() : null,
        kit_type: r["kit_type"] ?? null,
      }));

    if (parsed.length === 0) { toast.error("Nenhuma linha válida encontrada. Verifique a coluna 'nome'."); return; }

    let inserted = 0;
    let duplicates = 0;
    for (let i = 0; i < parsed.length; i += 200) {
      const chunk = parsed.slice(i, i + 200);
      const { error, count } = await supabase
        .from("athletes")
        .upsert(chunk, { onConflict: "event_id,cpf", ignoreDuplicates: true, count: "exact" });
      if (error) {
        toast.error("Erro na importação", { description: error.message });
        break;
      }
      inserted += count ?? chunk.length;
      duplicates += chunk.length - (count ?? chunk.length);
    }
    void logAudit({
      eventId,
      action: `Importou ${inserted} atletas`,
      entity: "athletes",
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries({ queryKey: ["athletes", eventId] });
    toast.success(`Importação concluída: ${inserted} inseridos, ${duplicates} duplicados ignorados.`);
  }

  function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => void importRows(res.data),
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const wb = XLSX.read(reader.result, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!]!;
      void importRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet));
    };
    reader.readAsArrayBuffer(file);
  }

  async function createAthlete() {
    if (!eventId || !form.name.trim()) { toast.error("Informe o nome do atleta."); return; }
    const { error } = await supabase.from("athletes").insert({
      event_id: eventId,
      name: form.name.trim(),
      cpf: form.cpf ? onlyDigits(form.cpf) : null,
      bib_number: form.bib_number || null,
      modality: form.modality || null,
      shirt_size: form.shirt_size ? form.shirt_size.toUpperCase() : null,
    });
    if (error) { toast.error("Não foi possível cadastrar", { description: error.message }); return; }
    await qc.invalidateQueries({ queryKey: ["athletes", eventId] });
    setNewOpen(false);
    setForm({ name: "", cpf: "", bib_number: "", modality: "", shirt_size: "" });
    toast.success("Atleta cadastrado.");
  }

  function exportCsv() {
    const csv = Papa.unparse(
      athletes.map((a) => ({
        Nome: a.name,
        CPF: a.cpf,
        Inscricao: a.registration_number,
        Peito: a.bib_number,
        Modalidade: a.modality,
        Camiseta: a.shirt_size,
        Status: KIT_STATUS[a.kit_status] ?? a.kit_status,
      })),
    );
    downloadBlob("\uFEFF" + csv, `atletas-${event?.slug ?? "evento"}.csv`, "text/csv;charset=utf-8");
  }

  return (
    <AppShell>
      <PageHeader
        title="Atletas"
        subtitle={`${athletes.length} inscritos · ${event?.name ?? ""}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Importar
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="size-4" />
            </Button>
          </div>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <Input
        placeholder="Buscar por nome, CPF, inscrição ou nº de peito"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="mb-4 h-12"
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atleta</TableHead>
                <TableHead>Nº</TableHead>
                <TableHead className="hidden sm:table-cell">CPF</TableHead>
                <TableHead className="hidden md:table-cell">Modalidade</TableHead>
                <TableHead>Camiseta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7}>Carregando…</TableCell>
                </TableRow>
              )}
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-[220px] truncate font-medium">{a.name}</TableCell>
                  <TableCell className="numeric">{a.bib_number ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{maskCPF(a.cpf)}</TableCell>
                  <TableCell className="hidden md:table-cell">{a.modality ?? "—"}</TableCell>
                  <TableCell>{a.shirt_size ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={a.kit_status === "pending" ? "secondary" : "default"}>
                      {KIT_STATUS[a.kit_status] ?? a.kit_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setQrAthlete(a)}>
                      <QrCode className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    Nenhum atleta encontrado. Importe a lista de inscritos em CSV ou Excel.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!qrAthlete} onOpenChange={(v) => !v && setQrAthlete(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="truncate">{qrAthlete?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-2">
            {qrAthlete && eventId && <QRCodeSVG value={qrPayload(eventId, qrAthlete.id)} size={200} />}
            <p className="text-muted-foreground text-xs">Nº {qrAthlete?.bib_number ?? "—"}</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo atleta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Nº de peito</Label>
                <Input
                  value={form.bib_number}
                  onChange={(e) => setForm({ ...form, bib_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modalidade</Label>
                <Input
                  value={form.modality}
                  onChange={(e) => setForm({ ...form, modality: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Camiseta</Label>
                <Input
                  value={form.shirt_size}
                  onChange={(e) => setForm({ ...form, shirt_size: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void createAthlete()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
