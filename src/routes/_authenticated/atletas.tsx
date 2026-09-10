import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { AlertTriangle, Download, Loader2, Pencil, Plus, QrCode, Trash2, Upload } from "lucide-react";
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
  formatCPF,
  isValidCPF,
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
  shirt_size: string | null;
  kit_type: string | null;
  kit_status: string;
  payment_status: string;
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
  shirt_size: "",
  kit_type: "",
  payment_status: "pago",
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
  camiseta: "shirt_size",
  camisa: "shirt_size",
  tamanho: "shirt_size",
  kit: "kit_type",
  status: "payment_status",
  pagamento: "payment_status",
  "status pagamento": "payment_status",
  situacao: "payment_status",
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

function normPayment(value: string | null | undefined): string {
  return /pend/i.test(value ?? "") ? "pendente" : "pago";
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
  const { profile, isAdmin } = useAuth();
  const lockAt = event?.athletes_lock_at ?? null;
  const locked = !isAdmin && !!lockAt && new Date(lockAt).getTime() <= Date.now();
  const canImport = isAdmin || !!event?.allow_organizer_import;
  const lockLabel = lockAt
    ? new Date(lockAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const [qrAthlete, setQrAthlete] = useState<Athlete | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [importIssues, setImportIssues] = useState<{ line: number; name: string; problem: string }[] | null>(null);
  const [importMode, setImportMode] = useState<"add" | "replace">("add");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [modalityOther, setModalityOther] = useState(false);
  const [categoryOther, setCategoryOther] = useState(false);
  const [shirtOther, setShirtOther] = useState(false);
  const [customModality, setCustomModality] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customShirt, setCustomShirt] = useState("");





  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ["athletes", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const data = await fetchAllRows<Athlete>(() =>
        supabase
          .from("athletes")
          .select(
            "id,name,gender,birth_date,city,equipe,cpf,email,phone,registration_number,bib_number,modality,category,shirt_size,kit_type,kit_status,payment_status,custom_1,custom_2,custom_3,custom_4,custom_5",
          )
          .eq("event_id", eventId!)
          .order("name"),
      );
      return data;
    },
  });

  /** Valores já usados neste evento (sugestões, mas livre para digitar). */
  const importedSizes = useMemo(() => {
    const set = new Set<string>();
    for (const a of athletes) {
      const s = (a.shirt_size ?? "").trim().toUpperCase();
      if (s) set.add(s);
    }
    return [...set].sort();
  }, [athletes]);

  const importedModalities = useMemo(() => {
    const set = new Set<string>();
    for (const a of athletes) {
      const s = (a.modality ?? "").trim();
      if (s) set.add(s);
    }
    return [...set].sort();
  }, [athletes]);

  const importedCategories = useMemo(() => {
    const set = new Set<string>();
    for (const a of athletes) {
      const s = (a.category ?? "").trim();
      if (s) set.add(s);
    }
    return [...set].sort();
  }, [athletes]);

  // Sexo fixo: MASCULINO / FEMININO



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
          (a.equipe ?? "").toLowerCase().includes(q) ||
          (digits.length >= 3 && onlyDigits(a.cpf).includes(digits)),
      )
      .slice(0, 300);
  }, [athletes, term]);

  const cpfWarning = useMemo(() => {
    const cpf = onlyDigits(form.cpf);
    if (cpf.length === 11) {
      const hit = athletes.find((a) => onlyDigits(a.cpf) === cpf && a.id !== editingId);
      if (hit) return `Este CPF já está cadastrado neste evento (${hit.name}).`;
    }
    return null;
  }, [athletes, form.cpf, editingId]);

  const bibDuplicate = useMemo(() => {
    const bib = form.bib_number.trim();
    if (!bib) return false;
    return athletes.some((a) => (a.bib_number ?? "") === bib && a.id !== editingId);
  }, [athletes, form.bib_number, editingId]);

  const bibWarning = useMemo(() => {
    const bib = form.bib_number.trim();
    if (!bib) return null;
    const hit = athletes.find((a) => (a.bib_number ?? "") === bib && a.id !== editingId);
    if (hit) return `O nº ${bib} já está em uso neste evento (${hit.name}).`;
    return null;
  }, [athletes, form.bib_number, editingId]);

  function openNew() {
    if (locked) {
      toast.error("Cadastro de atletas encerrado", {
        description: `O prazo terminou em ${lockLabel}. Fale com o administrador.`,
      });
      return;
    }
    setForm({
      ...EMPTY_FORM,
      gender: "MASCULINO",
      modality: importedModalities[0] ?? "",
      category: importedCategories[0] ?? "",
      shirt_size: importedSizes[0] ?? "",
    });
    setEditingId(null);
    setDupWarning(null);
    setModalityOther(false);
    setCategoryOther(false);
    setShirtOther(false);
    setCustomModality("");
    setCustomCategory("");
    setCustomShirt("");
    setNewOpen(true);
  }




  function openEdit(a: Athlete) {
    if (locked) {
      toast.error("Alteração de atletas encerrada", {
        description: `O prazo terminou em ${lockLabel}. Fale com o administrador.`,
      });
      return;
    }
    const modalityKnown = importedModalities.includes(a.modality ?? "");
    const categoryKnown = importedCategories.includes(a.category ?? "");
    const shirtKnown = importedSizes.includes(a.shirt_size ?? "");
    const rawGender = (a.gender ?? "").trim().toUpperCase();
    const normalizedGender = rawGender
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const genderValue = normalizedGender.startsWith("F")
      ? "FEMININO"
      : "MASCULINO";
    setForm({
      name: a.name ?? "",
      gender: genderValue,

      birth_date: a.birth_date ? formatDate(a.birth_date) : "",
      city: a.city ?? "",
      equipe: a.equipe ?? "",
      cpf: a.cpf ?? "",
      email: a.email ?? "",
      phone: a.phone ?? "",
      registration_number: a.registration_number ?? "",
      bib_number: a.bib_number ?? "",
      modality: modalityKnown ? (a.modality ?? "") : a.modality ? "__other__" : "",
      category: categoryKnown ? (a.category ?? "") : a.category ? "__other__" : "",
      shirt_size: shirtKnown ? (a.shirt_size ?? "") : a.shirt_size ? "__other__" : "",
      kit_type: a.kit_type ?? "",
      payment_status: a.payment_status ?? "pago",
      custom_1: a.custom_1 ?? "",
      custom_2: a.custom_2 ?? "",
      custom_3: a.custom_3 ?? "",
      custom_4: a.custom_4 ?? "",
      custom_5: a.custom_5 ?? "",
    });
    setModalityOther(!modalityKnown && !!a.modality);
    setCategoryOther(!categoryKnown && !!a.category);
    setShirtOther(!shirtKnown && !!a.shirt_size);
    setCustomModality(modalityKnown ? "" : (a.modality ?? ""));
    setCustomCategory(categoryKnown ? "" : (a.category ?? ""));
    setCustomShirt(shirtKnown ? "" : (a.shirt_size ?? ""));
    setEditingId(a.id);
    setDupWarning(null);
    setNewOpen(true);
  }






  async function importRows(rows: Record<string, unknown>[], fresh = false) {
    if (!eventId) return;
    const map: Record<string, string> = { ...COLUMN_MAP };
    (event?.custom_field_labels ?? []).forEach((label, i) => {
      if (label?.trim()) map[normalizeKey(label)] = CUSTOM_KEYS[i]!;
    });
    const mapped = rows.map((row) => {
      const out: Record<string, string | null> = {};
      Object.entries(row).forEach(([key, value]) => {
        const mappedKey = map[normalizeKey(key)];
        if (mappedKey) out[mappedKey] = value == null || value === "" ? null : String(value).trim();
      });
      return out;
    });

    const base = fresh ? [] : athletes;
    const existingBib = new Set(base.map((a) => a.bib_number ?? "").filter(Boolean));
    const existingReg = new Set(base.map((a) => a.registration_number ?? "").filter(Boolean));
    const sheetBib = new Map<string, number>();
    const sheetReg = new Map<string, number>();
    const issues: { line: number; name: string; problem: string }[] = [];
    const records: {
      event_id: string;
      name: string;
      gender: string | null;
      birth_date: string | null;
      city: string | null;
      equipe: string | null;
      cpf: string | null;
      email: string | null;
      phone: string | null;
      registration_number: string | null;
      bib_number: string;
      modality: string | null;
      category: string | null;
      shirt_size: string | null;
      kit_type: string | null;
      payment_status: string;
      custom_1: string | null;
      custom_2: string | null;
      custom_3: string | null;
      custom_4: string | null;
      custom_5: string | null;
    }[] = [];

    mapped.forEach((r, index) => {
      const line = index + 2;
      const isEmpty = Object.values(r).every((v) => !v);
      if (isEmpty) return;
      const problems: string[] = [];
      if (!r["name"]) problems.push("nome em branco");
      if (!r["gender"]) problems.push("sexo em branco");
      if (!r["modality"]) problems.push("modalidade em branco");
      const birth = r["birth_date"] ? parseBrDate(r["birth_date"]) : null;
      if (!r["birth_date"]) problems.push("data de nascimento em branco");
      else if (!birth) problems.push(`data de nascimento inválida (${r["birth_date"]})`);
      const cpf = r["cpf"] ? onlyDigits(r["cpf"]) : null;
      if (cpf && (cpf.length !== 11 || !isValidCPF(cpf))) problems.push(`CPF inválido (${r["cpf"]})`);
      const bib = r["bib_number"] ?? "";
      if (!bib) problems.push("número em branco");
      else if (existingBib.has(bib)) problems.push(`número ${bib} já cadastrado neste evento`);
      else if (sheetBib.has(bib)) problems.push(`número ${bib} repetido na planilha (linha ${sheetBib.get(bib)})`);
      const reg = r["registration_number"] ?? "";
      if (reg && existingReg.has(reg)) problems.push(`inscrição ${reg} já cadastrada neste evento`);
      else if (reg && sheetReg.has(reg))
        problems.push(`inscrição ${reg} repetida na planilha (linha ${sheetReg.get(reg)})`);

      if (problems.length > 0) {
        issues.push({ line, name: r["name"] ?? "", problem: problems.join("; ") });
        return;
      }
      if (bib) sheetBib.set(bib, line);
      if (reg) sheetReg.set(reg, line);
      records.push({
        event_id: eventId,
        name: r["name"]!,
        gender: r["gender"] ?? null,
        birth_date: birth,
        city: r["city"] ?? null,
        equipe: r["equipe"] ?? null,
        cpf,
        email: r["email"] ?? null,
        phone: r["phone"] ?? null,
        registration_number: reg || null,
        bib_number: bib,
        modality: r["modality"] ?? null,
        category: r["category"] ?? null,
        shirt_size: r["shirt_size"] ? r["shirt_size"].toUpperCase() : null,
        kit_type: r["kit_type"] ?? null,
        payment_status: normPayment(r["payment_status"]),
        custom_1: r["custom_1"] ?? null,
        custom_2: r["custom_2"] ?? null,
        custom_3: r["custom_3"] ?? null,
        custom_4: r["custom_4"] ?? null,
        custom_5: r["custom_5"] ?? null,
      });
    });

    if (issues.length > 0) {
      setImporting(false);
      setImportIssues(issues);
      toast.error(`A planilha tem ${issues.length} linha(s) com problema. Nada foi importado.`);
      return;
    }

    if (records.length === 0) {
      setImporting(false);
      toast.error("Nenhuma linha válida encontrada na planilha.");
      return;
    }

    let inserted = 0;
    for (let i = 0; i < records.length; i += 200) {
      const chunk = records.slice(i, i + 200);
      const { error, count } = await supabase.from("athletes").insert(chunk, { count: "exact" });
      if (error) {
        setImporting(false);
        toast.error("Erro na importação", { description: error.message });
        return;
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
    toast.success(`Importação concluída: ${inserted} atletas cadastrados.`);
  }


  function decodeCsv(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return text.replace(/^\uFEFF/, "");
    } catch {
      return new TextDecoder("windows-1252").decode(bytes);
    }
  }

  function parseFile(file: File, fresh: boolean) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    setLastFile(file.name);
    setImporting(true);
    if (ext === "csv") {
      const csvReader = new FileReader();
      csvReader.onload = () => {
        const text = decodeCsv(csvReader.result as ArrayBuffer);
        const res = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
        void importRows(res.data, fresh);
      };
      csvReader.readAsArrayBuffer(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const wb = XLSX.read(reader.result, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!]!;
      void importRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet), fresh);
    };
    reader.readAsArrayBuffer(file);
  }


  function handleFile(file: File) {
    if (!canImport) {
      toast.error("Envio de planilha não autorizado", {
        description: "Somente o administrador pode enviar a planilha deste evento.",
      });
      return;
    }
    if (locked) {
      toast.error("Cadastro de atletas encerrado", {
        description: `O prazo terminou em ${lockLabel}. Fale com o administrador.`,
      });
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!eventId) { toast.error("Selecione um evento antes de importar."); return; }
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) { toast.error("Formato não suportado. Envie um arquivo CSV, XLSX ou XLS."); return; }
    if (importMode === "replace" && athletes.length > 0) {
      setPendingFile(file);
      return;
    }
    parseFile(file, false);
  }

  /** Apaga todos os atletas do evento selecionado. */
  async function deleteAllAthletes() {
    if (!eventId) return false;
    setDeleting(true);
    const { error } = await supabase.from("athletes").delete().eq("event_id", eventId);
    setDeleting(false);
    if (error) {
      toast.error("Não foi possível excluir os atletas", {
        description:
          error.code === "23503"
            ? "Existem entregas registradas para atletas deste evento. Cancele as entregas antes de excluir."
            : error.message,
      });
      return false;
    }
    void logAudit({
      eventId,
      action: `Excluiu todos os atletas (${athletes.length})`,
      entity: "athletes",
      userName: profile?.name ?? null,
    });
    await qc.invalidateQueries({ queryKey: ["athletes", eventId] });
    return true;
  }

  async function confirmDeleteAll() {
    const ok = await deleteAllAthletes();
    if (ok) {
      setDeleteAllOpen(false);
      toast.success("Todos os atletas deste evento foram excluídos.");
    }
  }

  async function confirmReplaceImport() {
    const file = pendingFile;
    if (!file) return;
    const ok = await deleteAllAthletes();
    if (!ok) return;
    setPendingFile(null);
    parseFile(file, true);
  }

  async function saveAthlete() {
    if (!eventId) return;
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("nome");
    if (!form.birth_date) missing.push("data de nascimento");
    if (!form.gender) missing.push("sexo");
    if (!form.modality.trim()) missing.push("modalidade");
    
    if (!form.bib_number.trim()) missing.push("número");
    if (missing.length > 0) {
      toast.error("Campos obrigatórios", {
        description: `Informe: ${missing.join(", ")}.`,
      });
      return;
    }
    const cpfDigits = onlyDigits(form.cpf);
    if (cpfDigits && (cpfDigits.length !== 11 || !isValidCPF(cpfDigits))) {
      toast.error("CPF inválido", { description: "Digite um CPF válido com 11 dígitos ou deixe em branco." });
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
    if (bib) {
      const { data: dups } = await supabase
        .from("athletes")
        .select("id,name,bib_number")
        .eq("event_id", eventId)
        .eq("bib_number", bib);
      const dupBib = (dups ?? []).find((d) => d.id !== editingId);
      if (dupBib) {
        const msg = `O nº ${bib} já está em uso neste evento (${dupBib.name}).`;
        setDupWarning(msg);
        toast.error("Número duplicado", { description: msg });
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
      shirt_size: form.shirt_size ? form.shirt_size.toUpperCase() : null,
      kit_type: form.kit_type.trim() || null,
      payment_status: form.payment_status,
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
        Numero: a.bib_number,
        Nome: a.name,
        CPF: a.cpf,
        Telefone: a.phone,
        Email: a.email,
        Sexo: a.gender,
        Nascimento: a.birth_date,
        Cidade: a.city,
        Kit: a.kit_type,
        Camisa: a.shirt_size,
        Modalidade: a.modality,
        Categoria: a.category,
        Equipe: a.equipe,
        Status: a.payment_status === "pendente" ? "Pendente" : "Pago",
        "Numero de inscricao": a.registration_number,
        "Status do kit": KIT_STATUS[a.kit_status] ?? a.kit_status,
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
            <Button variant="outline" disabled={locked} onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Importar
            </Button>
            {canImport && (
              <Button
                variant="destructive"
                disabled={locked || athletes.length === 0}
                title="Excluir todos os atletas deste evento"
                onClick={() => setDeleteAllOpen(true)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button disabled={locked} onClick={openNew}>
              <Plus className="size-4" />
            </Button>
          </div>
        }
      />

      {lockAt && (
        <Card className="mb-4">
          <CardContent
            className={`p-3 text-sm ${locked ? "text-destructive font-semibold" : "text-muted-foreground"}`}
          >
            {locked
              ? `Cadastro e alteração de atletas encerrados em ${lockLabel}. Somente o administrador pode alterar este prazo.`
              : `Cadastro e alteração de atletas ficam disponíveis até ${lockLabel}.`}
          </CardContent>
        </Card>
      )}

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

      {!canImport && (
        <Card className="mb-4">
          <CardContent className="text-muted-foreground p-4 text-sm">
            O envio da planilha de inscritos deste evento está liberado apenas para o administrador.
            Peça a ele a autorização na tela de Eventos para poder enviar a planilha.
          </CardContent>
        </Card>
      )}

      <Card className={canImport ? "mb-4" : "mb-4 hidden"}>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant={importMode === "add" ? "default" : "outline"}
              className="flex-1 justify-start text-left"
              onClick={() => setImportMode("add")}
            >
              Adicionar aos atletas já cadastrados
            </Button>
            <Button
              type="button"
              variant={importMode === "replace" ? "destructive" : "outline"}
              className="flex-1 justify-start text-left"
              onClick={() => setImportMode("replace")}
            >
              Substituir toda a lista pela planilha
            </Button>
          </div>
          <p className="text-muted-foreground mb-3 text-xs">
            {importMode === "add"
              ? "A planilha será somada à lista atual; atletas repetidos são ignorados."
              : "Todos os atletas atuais deste evento serão excluídos antes de importar a nova planilha."}
          </p>
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
            {importing ? (
              <Loader2 className="text-primary size-8 animate-spin" />
            ) : (
              <Upload className="text-primary size-8" />
            )}
            <p className="mt-3 text-sm font-semibold">
              {importing
                ? "Conferindo e importando a planilha…"
                : "Arraste a planilha aqui ou clique para selecionar"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Aceita CSV, XLSX e XLS. Colunas na ordem: numero, nome, cpf, telefone, email, sexo,
              nascimento, cidade, kit, camisa, modalidade, categoria, equipe, status (Pago ou Pendente),
              numero de inscricao
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
                  "numero", "nome", "cpf", "telefone", "email", "sexo", "nascimento", "cidade",
                  "kit", "camisa", "modalidade", "categoria", "equipe", "status", "numero de inscricao",
                  "extra1", "extra2", "extra3", "extra4", "extra5",
                ];
                const exemplo = [
                  "1001", "Maria Silva", "123.456.789-09", "(31) 9999-9999", "maria@email.com",
                  "FEMININO", "15/05/1990", "São Paulo", "Kit Padrão", "M", "Corrida", "Feminino Geral",
                  "Equipe Exemplo", "Pago", "INS001", "", "", "", "", "",
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
        placeholder="Buscar por nome, CPF, inscrição, nº de peito ou equipe"
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
                <TableHead className="hidden lg:table-cell">Kit</TableHead>
                <TableHead>Camiseta</TableHead>
                <TableHead className="hidden lg:table-cell">Equipe</TableHead>
                <TableHead>Nº</TableHead>
                <TableHead className="hidden sm:table-cell">CPF</TableHead>
                <TableHead className="hidden md:table-cell">Modalidade</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={13}>Carregando…</TableCell>
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
                  <TableCell className="hidden lg:table-cell">{a.kit_type ?? "—"}</TableCell>
                  <TableCell>{a.shirt_size ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{a.equipe ?? "—"}</TableCell>
                  <TableCell className="numeric">{a.bib_number ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{maskCPF(a.cpf)}</TableCell>
                  <TableCell className="hidden md:table-cell">{a.modality ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={a.payment_status === "pendente" ? "destructive" : "outline"}>
                      {a.payment_status === "pendente" ? "Pendente" : "Pago"}
                    </Badge>
                  </TableCell>
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
                  <TableCell colSpan={13} className="text-muted-foreground">
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
            {(dupWarning || cpfWarning || bibWarning) && (
              <div className="space-y-2">
                {dupWarning && (
                  <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{dupWarning}</span>
                  </div>
                )}
                {cpfWarning && (
                  <div className="border-warning/40 bg-warning/10 text-warning flex items-start gap-2 rounded-md border p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{cpfWarning}</span>
                  </div>
                )}
                {bibWarning && (
                  <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{bibWarning}</span>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Número *</Label>
                <Input
                  value={form.bib_number}
                  onChange={(e) => setForm({ ...form, bib_number: e.target.value })}
                />
              </div>
            </div>
            <div
              className={`grid grid-cols-1 gap-3 rounded-md sm:grid-cols-2 ${
                bibDuplicate ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  disabled={bibDuplicate}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input
                  disabled={bibDuplicate}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  disabled={bibDuplicate}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  disabled={bibDuplicate}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <select
                  disabled={bibDuplicate}
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="MASCULINO">MASCULINO</option>
                  <option value="FEMININO">FEMININO</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Data de nascimento *</Label>
                <Input
                  disabled={bibDuplicate}
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: maskBrDate(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input
                  disabled={bibDuplicate}
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kit</Label>
                <Input
                  disabled={bibDuplicate}
                  value={form.kit_type}
                  onChange={(e) => setForm({ ...form, kit_type: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Camisa</Label>
                <select
                  disabled={bibDuplicate}
                  value={shirtOther ? "__other__" : form.shirt_size}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__other__") {
                      setShirtOther(true);
                      setCustomShirt("");
                      setForm({ ...form, shirt_size: "" });
                    } else {
                      setShirtOther(false);
                      setCustomShirt("");
                      setForm({ ...form, shirt_size: value });
                    }
                  }}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importedSizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__other__">+ Digitar novo</option>
                </select>
                {shirtOther && (
                  <Input
                    disabled={bibDuplicate}
                    placeholder="Digite o tamanho (ex: M, G, 42)"
                    value={customShirt}
                    onChange={(e) => {
                      const upper = e.target.value.toUpperCase();
                      setCustomShirt(upper);
                      setForm({ ...form, shirt_size: upper });
                    }}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Modalidade *</Label>
                <select
                  disabled={bibDuplicate}
                  value={modalityOther ? "__other__" : form.modality}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__other__") {
                      setModalityOther(true);
                      setCustomModality("");
                      setForm({ ...form, modality: "" });
                    } else {
                      setModalityOther(false);
                      setCustomModality("");
                      setForm({ ...form, modality: value });
                    }
                  }}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importedModalities.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__other__">+ Digitar novo</option>
                </select>
                {modalityOther && (
                  <Input
                    disabled={bibDuplicate}
                    placeholder="Digite a modalidade"
                    value={customModality}
                    onChange={(e) => {
                      setCustomModality(e.target.value);
                      setForm({ ...form, modality: e.target.value });
                    }}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select
                  disabled={bibDuplicate}
                  value={categoryOther ? "__other__" : form.category}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__other__") {
                      setCategoryOther(true);
                      setCustomCategory("");
                      setForm({ ...form, category: "" });
                    } else {
                      setCategoryOther(false);
                      setCustomCategory("");
                      setForm({ ...form, category: value });
                    }
                  }}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importedCategories.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__other__">+ Digitar novo</option>
                </select>
                {categoryOther && (
                  <Input
                    disabled={bibDuplicate}
                    placeholder="Digite a categoria"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      setForm({ ...form, category: e.target.value });
                    }}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Equipe</Label>
                <Input
                  disabled={bibDuplicate}
                  value={form.equipe}
                  onChange={(e) => setForm({ ...form, equipe: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  disabled={bibDuplicate}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.payment_status}
                  onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
                >
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Número de inscrição</Label>
                <Input
                  disabled={bibDuplicate}
                  value={form.registration_number}
                  onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                />
              </div>
              {CUSTOM_KEYS.map((key, i) => (
                <div key={key} className="space-y-1.5">
                  <Label>{event?.custom_field_labels?.[i]?.trim() || `Campo extra ${i + 1}`}</Label>
                  <Input
                    disabled={bibDuplicate}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void saveAthlete()} disabled={bibDuplicate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllOpen} onOpenChange={(o) => !deleting && setDeleteAllOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir todos os atletas?</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Os <strong>{athletes.length}</strong> atletas de <strong>{event?.name ?? "este evento"}</strong>{" "}
            serão apagados definitivamente. Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteAllOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void confirmDeleteAll()}>
              {deleting ? "Excluindo…" : "Excluir todos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingFile} onOpenChange={(o) => !deleting && !o && setPendingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir a lista de atletas?</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Os <strong>{athletes.length}</strong> atletas atuais serão excluídos e a lista passará a ter
            somente os dados da planilha <strong>{pendingFile?.name}</strong>. Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setPendingFile(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void confirmReplaceImport()}>
              {deleting ? "Substituindo…" : "Substituir tudo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!importIssues} onOpenChange={(o) => !o && setImportIssues(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-5" />
              A planilha precisa de correção
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Nada foi importado. Corrija as linhas abaixo na planilha e envie novamente.
          </p>
          <ul className="space-y-2 text-sm">
            {(importIssues ?? []).slice(0, 100).map((issue) => (
              <li key={`${issue.line}-${issue.problem}`} className="rounded-md border p-2">
                <span className="font-semibold">Linha {issue.line}</span>
                {issue.name ? ` — ${issue.name}` : ""}: {issue.problem}
              </li>
            ))}
          </ul>
          {(importIssues?.length ?? 0) > 100 && (
            <p className="text-muted-foreground text-xs">
              Mostrando as 100 primeiras de {importIssues?.length} linhas com problema.
            </p>
          )}
          <DialogFooter>
            <Button onClick={() => setImportIssues(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
