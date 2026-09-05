import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { AlertTriangle, Download, Pencil, Plus, QrCode, Upload } from "lucide-react";
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
      { title: "Atletas — Kit Rápido" },
      { name: "description", content: "Importe, cadastre e acompanhe os atletas inscritos no evento." },
      { property: "og:title", content: "Atletas — Kit Rápido" },
      { property: "og:description", content: "Base de inscritos com importação de CSV e Excel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Atletas,
});

type Athlete = {
  id: string;
  name: string;
  gender: string | null;
  birth_date: string | null;
  city: string | null;
  equipe: string | null;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  registration_number: string | null;
  bib_number: string | null;
  modality: string | null;
  category: string | null;
  distance: string | null;
  shirt_size: string | null;
  kit_type: string | null;
  kit_status: string;
  custom_1?: string | null;
  custom_2?: string | null;
  custom_3?: string | null;
  custom_4?: string | null;
  custom_5?: string | null;
};

const EMPTY_FORM = {
  name: "",
  gender: "",
  birth_date: "",
  city: "",
  equipe: "",
  cpf: "",
  email: "",
  phone: "",
  registration_number: "",
  bib_number: "",
  modality: "",
  category: "",
  distance: "",
  shirt_size: "",
  kit_type: "",
  custom_1: "",
  custom_2: "",
  custom_3: "",
  custom_4: "",
  custom_5: "",
};

const CUSTOM_KEYS = ["custom_1", "custom_2", "custom_3", "custom_4", "custom_5"] as const;


const COLUMN_MAP: Record<string, string> = {
  nome: "name",
  atleta: "name",
  sexo: "gender",
  genero: "gender",
  nascimento: "birth_date",
  "data de nascimento": "birth_date",
  cidade: "city",
  equipe: "equipe",
  time: "equipe",
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
  extra1: "custom_1",
  extra2: "custom_2",
  extra3: "custom_3",
  extra4: "custom_4",
  extra5: "custom_5",
  campo1: "custom_1",
  campo2: "custom_2",
  campo3: "custom_3",
  campo4: "custom_4",
  campo5: "custom_5",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function parseBrDate(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) {
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    return `${y}-${m}-${d}`;
  }
  // aceita formato yyyy-mm-dd se colar
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

function maskBrDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

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
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState<string | null>(null);


  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ["athletes", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(
          "id,name,gender,birth_date,city,equipe,cpf,email,phone,registration_number,bib_number,modality,category,distance,shirt_size,kit_type,kit_status,custom_1,custom_2,custom_3,custom_4,custom_5",
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

  const liveDup = useMemo(() => {
    const cpf = onlyDigits(form.cpf);
    const bib = form.bib_number.trim();
    if (cpf.length === 11) {
      const hit = athletes.find((a) => onlyDigits(a.cpf) === cpf && a.id !== editingId);
      if (hit) return `Este CPF já está cadastrado neste evento (${hit.name}).`;
    }
    if (bib) {
      const hit = athletes.find((a) => (a.bib_number ?? "") === bib && a.id !== editingId);
      if (hit) return `O nº de peito ${bib} já está em uso neste evento (${hit.name}).`;
    }
    return null;
  }, [athletes, form.cpf, form.bib_number, editingId]);

  function openNew() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setDupWarning(null);
    setNewOpen(true);
  }

  function openEdit(a: Athlete) {
    setForm({
      name: a.name ?? "",
      gender: a.gender ?? "",
      birth_date: a.birth_date ? formatDate(a.birth_date) : "",
      city: a.city ?? "",
      equipe: a.equipe ?? "",
      cpf: a.cpf ?? "",
      email: a.email ?? "",
      phone: a.phone ?? "",
      registration_number: a.registration_number ?? "",
      bib_number: a.bib_number ?? "",
      modality: a.modality ?? "",
      category: a.category ?? "",
      distance: a.distance ?? "",
      shirt_size: a.shirt_size ?? "",
      kit_type: a.kit_type ?? "",
      custom_1: a.custom_1 ?? "",
      custom_2: a.custom_2 ?? "",
      custom_3: a.custom_3 ?? "",
      custom_4: a.custom_4 ?? "",
      custom_5: a.custom_5 ?? "",
    });
    setEditingId(a.id);
    setDupWarning(null);
    setNewOpen(true);
  }



  async function importRows(rows: Record<string, unknown>[]) {
    if (!eventId) return;
    const map: Record<string, string> = { ...COLUMN_MAP };
    (event?.custom_field_labels ?? []).forEach((label, i) => {
      if (label?.trim()) map[normalizeKey(label)] = CUSTOM_KEYS[i]!;
    });
    const parsed = rows
      .map((row) => {
        const out: Record<string, string | null> = {};
        Object.entries(row).forEach(([key, value]) => {
          const mapped = map[normalizeKey(key)];
          if (mapped) out[mapped] = value == null || value === "" ? null : String(value).trim();
        });
        return out;
      })
      .filter((r) => r["name"] && r["birth_date"] && r["gender"] && r["modality"])
      .map((r) => ({
        event_id: eventId,
        name: r["name"]!,
        gender: r["gender"] ?? null,
        birth_date: r["birth_date"] ?? null,
        city: r["city"] ?? null,
        equipe: r["equipe"] ?? null,
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
        custom_1: r["custom_1"] ?? null,
        custom_2: r["custom_2"] ?? null,
        custom_3: r["custom_3"] ?? null,
        custom_4: r["custom_4"] ?? null,
        custom_5: r["custom_5"] ?? null,
      }));

    const incomplete = rows.length - parsed.length;
    if (parsed.length === 0) {
      setImporting(false);
      toast.error("Nenhuma linha válida encontrada.", {
        description:
          "Nome, data de nascimento, sexo e modalidade são obrigatórios em todas as linhas.",
      });
      return;
    }

    const seenCpf = new Set(athletes.map((a) => onlyDigits(a.cpf)).filter(Boolean));
    const seenBib = new Set(athletes.map((a) => a.bib_number ?? "").filter(Boolean));
    let dupCpfCount = 0;
    let dupBibCount = 0;
    const unique = parsed.filter((row) => {
      const cpf = row.cpf ?? "";
      const bib = row.bib_number ?? "";
      if (cpf && seenCpf.has(cpf)) { dupCpfCount++; return false; }
      if (bib && seenBib.has(bib)) { dupBibCount++; return false; }
      if (cpf) seenCpf.add(cpf);
      if (bib) seenBib.add(bib);
      return true;
    });

    let inserted = 0;
    const duplicates = dupCpfCount + dupBibCount;
    for (let i = 0; i < unique.length; i += 200) {
      const chunk = unique.slice(i, i + 200);
      const { error, count } = await supabase
        .from("athletes")
        .upsert(chunk, { onConflict: "event_id,cpf", ignoreDuplicates: true, count: "exact" });
      if (error) {
        toast.error("Erro na importação", {
          description:
            error.code === "23505"
              ? "Existem CPFs ou números de peito repetidos na planilha ou já cadastrados."
              : error.message,
        });
        break;
      }
      inserted += count ?? chunk.length;
    }
    void logAudit({
      eventId,
      action: `Importou ${inserted} atletas`,
      entity: "athletes",
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries({ queryKey: ["athletes", eventId] });
    setImporting(false);
    toast.success(`Importação concluída: ${inserted} inseridos, ${duplicates} duplicados ignorados.`, {
      description: [
        duplicates > 0
          ? `${dupCpfCount} com CPF repetido e ${dupBibCount} com nº de peito repetido.`
          : null,
        incomplete > 0
          ? `${incomplete} linha(s) ignoradas por falta de nome, nascimento, sexo ou modalidade.`
          : null,
      ]
        .filter(Boolean)
        .join(" ") || undefined,
    });
  }

  function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!eventId) { toast.error("Selecione um evento antes de importar."); return; }
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) { toast.error("Formato não suportado. Envie um arquivo CSV, XLSX ou XLS."); return; }
    setLastFile(file.name);
    setImporting(true);
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

  async function saveAthlete() {
    if (!eventId) return;
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("nome");
    if (!form.birth_date) missing.push("data de nascimento");
    if (!form.gender) missing.push("sexo");
    if (!form.modality.trim()) missing.push("modalidade");
    if (missing.length > 0) {
      toast.error("Campos obrigatórios", {
        description: `Informe: ${missing.join(", ")}.`,
      });
      return;
    }
    const birthIso = parseBrDate(form.birth_date);
    if (!birthIso) {
      toast.error("Data de nascimento inválida", {
        description: "Digite no formato dd/mm/aaaa.",
      });
      return;
    }
    setDupWarning(null);
    const cpf = form.cpf ? onlyDigits(form.cpf) : null;
    const bib = form.bib_number.trim() || null;
    if (cpf || bib) {
      const filters: string[] = [];
      if (cpf) filters.push(`cpf.eq.${cpf}`);
      if (bib) filters.push(`bib_number.eq.${bib}`);
      const { data: dups } = await supabase
        .from("athletes")
        .select("id,name,cpf,bib_number")
        .eq("event_id", eventId)
        .or(filters.join(","));
      const others = (dups ?? []).filter((d) => d.id !== editingId);
      const dupCpf = cpf ? others.find((d) => onlyDigits(d.cpf) === cpf) : null;
      const dupBib = bib ? others.find((d) => d.bib_number === bib) : null;
      if (dupCpf || dupBib) {
        const msg = dupCpf
          ? `Este CPF já está cadastrado neste evento (${dupCpf.name}).`
          : `O nº de peito ${bib} já está em uso neste evento (${dupBib!.name}).`;
        setDupWarning(msg);
        toast.error("Dado duplicado", { description: msg });
        return;
      }
    }
    const payload = {
      name: form.name.trim(),
      birth_date: birthIso,
      gender: form.gender,
      city: form.city.trim() || null,
      equipe: form.equipe.trim() || null,
      cpf,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      registration_number: form.registration_number.trim() || null,
      bib_number: bib,
      modality: form.modality.trim(),
      category: form.category.trim() || null,
      distance: form.distance.trim() || null,
      shirt_size: form.shirt_size ? form.shirt_size.toUpperCase() : null,
      kit_type: form.kit_type.trim() || null,
      custom_1: form.custom_1.trim() || null,
      custom_2: form.custom_2.trim() || null,
      custom_3: form.custom_3.trim() || null,
      custom_4: form.custom_4.trim() || null,
      custom_5: form.custom_5.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("athletes").update(payload).eq("id", editingId)
      : await supabase.from("athletes").insert({ event_id: eventId, ...payload });
    if (error) {
      const dup = error.code === "23505";
      const msg = dup
        ? "CPF ou nº de peito já cadastrado neste evento."
        : error.message;
      if (dup) setDupWarning(msg);
      toast.error("Não foi possível salvar", { description: msg });
      return;
    }
    void logAudit({
      eventId,
      action: editingId ? `Editou atleta ${payload.name}` : `Cadastrou atleta ${payload.name}`,
      entity: "athletes",
      entityId: editingId,
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries({ queryKey: ["athletes", eventId] });
    setNewOpen(false);
    setForm({ ...EMPTY_FORM });
    toast.success(editingId ? "Dados atualizados." : "Atleta cadastrado.");
    setEditingId(null);
  }


  function exportCsv() {
    const csv = Papa.unparse(
      athletes.map((a) => ({
        Nome: a.name,
        Sexo: a.gender,
        Nascimento: a.birth_date,
        Cidade: a.city,
        Equipe: a.equipe,
        CPF: a.cpf,
        Inscricao: a.registration_number,
        Peito: a.bib_number,
        Modalidade: a.modality,
        Categoria: a.category,
        Camiseta: a.shirt_size,
        Kit: a.kit_type,
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
            <Button onClick={openNew}>
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

      <Card className="mb-4">
        <CardContent className="p-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
            }`}
          >
            <Upload className="text-primary size-8" />
            <p className="mt-3 text-sm font-semibold">
              {importing
                ? "Importando arquivo…"
                : "Arraste a planilha aqui ou clique para selecionar"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Aceita CSV, XLSX e XLS. Colunas reconhecidas: nome, sexo, data de nascimento, cidade,
              cpf, e-mail, telefone, inscrição, peito, modalidade, categoria, distância, camiseta, kit
              e os 5 campos personalizados (use extra1 a extra5 ou o nome que você definiu no evento).
            </p>
            {lastFile && !importing && (
              <p className="text-muted-foreground mt-2 text-xs">Último arquivo: {lastFile}</p>
            )}
          </div>
          <div className="mt-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const headers = [
                  "nome", "sexo", "nascimento", "cidade", "equipe", "cpf", "email", "telefone",
                  "inscricao", "peito", "modalidade", "categoria", "distancia", "camiseta", "kit",
                  "extra1", "extra2", "extra3", "extra4", "extra5",
                ];
                const exemplo = [
                  "Maria Silva", "F", "1990-05-15", "São Paulo", "Equipe Exemplo", "12345678909",
                  "maria@email.com", "11999999999", "INS001", "1001", "Corrida", "Feminino Geral",
                  "10km", "M", "Kit Padrão", "", "", "", "", "",
                ];
                const ws = XLSX.utils.aoa_to_sheet([headers, exemplo]);
                ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 12) }));
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Atletas");
                const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
                downloadBlob(
                  out,
                  "modelo-atletas.xlsx",
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                );
              }}
            >
              <Download className="size-4" /> Baixar planilha modelo
            </Button>
          </div>
        </CardContent>
      </Card>



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
                <TableHead className="hidden sm:table-cell">Sexo</TableHead>
                <TableHead className="hidden md:table-cell">Nascimento</TableHead>
                <TableHead className="hidden md:table-cell">Cidade</TableHead>
                <TableHead className="hidden lg:table-cell">Equipe</TableHead>
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
                  <TableCell colSpan={10}>Carregando…</TableCell>
                </TableRow>
              )}
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0"
                        title="Editar dados"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <span className="max-w-[200px] truncate">{a.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{a.gender ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(a.birth_date)}</TableCell>
                  <TableCell className="hidden md:table-cell">{a.city ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{a.equipe ?? "—"}</TableCell>
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
                  <TableCell colSpan={10} className="text-muted-foreground">
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

      <Dialog open={newOpen} onOpenChange={(v) => { setNewOpen(v); setDupWarning(null); if (!v) setEditingId(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar atleta" : "Novo atleta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(dupWarning || liveDup) && (
              <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{dupWarning ?? liveDup}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data de nascimento *</Label>
                <Input
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: maskBrDate(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Equipe</Label>
                <Input value={form.equipe} onChange={(e) => setForm({ ...form, equipe: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Nº de inscrição</Label>
                <Input
                  value={form.registration_number}
                  onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nº de peito</Label>
                <Input
                  value={form.bib_number}
                  onChange={(e) => setForm({ ...form, bib_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modalidade *</Label>
                <Input
                  value={form.modality}
                  onChange={(e) => setForm({ ...form, modality: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Distância</Label>
                <Input
                  value={form.distance}
                  onChange={(e) => setForm({ ...form, distance: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Camiseta</Label>
                <Input
                  value={form.shirt_size}
                  onChange={(e) => setForm({ ...form, shirt_size: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kit</Label>
                <Input
                  value={form.kit_type}
                  onChange={(e) => setForm({ ...form, kit_type: e.target.value })}
                />
              </div>
              {CUSTOM_KEYS.map((key, i) => (
                <div key={key} className="space-y-1.5">
                  <Label>{event?.custom_field_labels?.[i]?.trim() || `Campo extra ${i + 1}`}</Label>
                  <Input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void saveAthlete()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
