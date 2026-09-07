import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, FileDown, Image as ImageIcon, MapPin, Navigation, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { athleteQrUrl, formatCPF, formatDate, formatDateTime, isValidCPF, mapsUrl } from "@/lib/cronochip";
import { customFields } from "@/lib/display";
import { downloadCredentialPdf, downloadCredentialPng } from "@/lib/credential";

export const Route = createFileRoute("/checkin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Check-in do atleta — Kit Rápido" },
      {
        name: "description",
        content:
          "Informe seu CPF, confira seus dados em todos os eventos ativos e gere a credencial com QR Code para a retirada do kit.",
      },
      { property: "og:title", content: "Check-in do atleta — Kit Rápido" },
      {
        property: "og:description",
        content: "Consulte pelo CPF e gere sua credencial com QR Code para retirar o kit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkin,
});

type KitRow = {
  athlete_id: string;
  name: string;
  bib_number: string | null;
  modality: string | null;
  category: string | null;
  shirt_size: string | null;
  kit_type: string | null;
  kit_status: string;
  city: string | null;
  birth_date: string | null;
  gender: string | null;
  payment_status: string | null;
  event_id: string;
  event_name: string;
  event_slug: string;
  event_date: string | null;
  event_time: string | null;
  event_city: string | null;
  event_state: string | null;
  event_address: string | null;
  start_location: string | null;
  pickup_address: string | null;
  pickup_city: string | null;
  pickup_info: string | null;
  pickup_maps_url: string | null;
  delivered_at: string | null;
  qr_payload: string;
  custom_labels: string[] | null;
  custom_values: string[] | null;
};

function Checkin() {
  const [doc, setDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<KitRow[] | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const digits = doc.replace(/\D/g, "");
    if (digits.length !== 11 || !isValidCPF(digits)) {
      toast.error("CPF inválido", { description: "Digite um CPF válido com 11 dígitos." });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("public_kit_lookup_all", { _doc: digits });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível consultar agora. Tente novamente.");
      return;
    }
    setRows((data as KitRow[] | null) ?? []);
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="mx-auto max-w-2xl px-4 py-6">
        <Brand />
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Check-in do atleta</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Informe seu CPF para ver suas inscrições em todos os eventos ativos, conferir seus dados e
          gerar a credencial com QR Code.
        </p>

        <form onSubmit={search} className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="doc">CPF</Label>
            <Input
              id="doc"
              inputMode="numeric"
              required
              value={doc}
              onChange={(e) => setDoc(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Consultando…" : "Fazer check-in"}
          </Button>
        </form>

        {rows && rows.length > 0 && (
          <p className="text-muted-foreground mt-6 text-sm">
            Encontramos <strong>{rows.length}</strong> inscrição{rows.length > 1 ? "ões" : ""} em eventos ativos. 
            Cada evento tem sua própria credencial para download.
          </p>
        )}

        {rows?.length === 0 && (
          <p className="text-destructive mt-6 text-sm font-medium">
            Não encontramos nenhuma inscrição com esse CPF nos eventos ativos.
          </p>
        )}

        <div className="mt-4 space-y-6">
          {rows?.map((row, idx) => <KitCard key={row.athlete_id} row={row} index={idx} total={rows.length} />)}
        </div>
      </main>
    </div>
  );
}

function hm(v?: string | null) {
  return v ? v.slice(0, 5) : "";
}

function genderLabel(v?: string | null) {
  const g = (v ?? "").trim().toUpperCase();
  if (g.startsWith("M")) return "Masculino";
  if (g.startsWith("F")) return "Feminino";
  return v || "—";
}

function KitCard({ row, index, total }: { row: KitRow; index: number; total: number }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const delivered = row.kit_status !== "pending" && row.kit_status !== "blocked";
  const scanUrl = athleteQrUrl(row.event_id, row.athlete_id);
  const extras = customFields(row.custom_labels, row.custom_values ?? []);

  const paid = (row.payment_status ?? "pago").trim().toLowerCase();
  const isPaid = paid === "pago" || paid === "paid";
  const startLine = [row.start_location || row.event_address, row.event_city ? `${row.event_city}${row.event_state ? `/${row.event_state}` : ""}` : null]
    .filter(Boolean)
    .join(" — ");
  const startTime = [row.event_date ? formatDate(row.event_date) : null, hm(row.event_time) ? `LARGADA ${hm(row.event_time)}` : null]
    .filter(Boolean)
    .join(" · ");
  const pickupInfo = row.pickup_info || "";
  const pickupLines = [
    { label: "Endereço", value: row.pickup_address || "" },
    { label: "Cidade", value: row.pickup_city || "" },
  ].filter((l) => l.value);
  const mapsHref = mapsUrl(row.pickup_maps_url, row.pickup_address, row.pickup_city);


  const athleteRows = [
    { label: "Número", value: row.bib_number || "—" },
    { label: "Nascimento", value: row.birth_date ? formatDate(row.birth_date) : "—" },
    { label: "Sexo", value: genderLabel(row.gender) },
    { label: "Status", value: isPaid ? "PAGO" : "PENDENTE PAGAMENTO" },
    { label: "Kit", value: row.kit_type || "—" },
    { label: "Camiseta", value: row.shirt_size || "—" },
    { label: "Modalidade", value: row.modality || "—" },
    { label: "Categoria", value: row.category || "—" },
    ...extras.map((f) => ({ label: f.label, value: f.value })),
  ];

  async function saveCredential(kind: "png" | "pdf") {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const data = {
      eventName: row.event_name,
      headerLines: [startLine, startTime].filter(Boolean),
      name: row.name,
      rows: athleteRows,
      pickup: pickupLines.length || pickupInfo ? { title: "Local da retirada do kit", lines: pickupLines, note: pickupInfo } : undefined,
      footer: delivered
        ? `KIT RETIRADO EM ${formatDateTime(row.delivered_at)}`
        : "Apresente este QR Code na retirada do kit",
    };
    const safeEvent = row.event_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const base = `voucher-${row.name.toLowerCase().replace(/\s+/g, "-")}${safeEvent ? `-${safeEvent}` : ""}${total > 1 ? `-${index + 1}` : ""}`;
    try {
      if (kind === "png") await downloadCredentialPng(data, svg, `${base}.png`);
      else await downloadCredentialPdf(data, svg, `${base}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o arquivo. Tente novamente.");
    }
  }

  return (
    <Card className="shadow-card">
      <CardContent className="space-y-5 p-0 pb-6">
        <div className="bg-primary text-primary-foreground relative rounded-t-xl px-5 py-6 text-center">
          {total > 1 && (
            <span className="bg-primary-foreground/20 absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold">
              {index + 1}/{total}
            </span>
          )}
          <p className="text-xl font-extrabold tracking-wide uppercase sm:text-2xl">{row.event_name}</p>
          {startLine && <p className="mt-1 text-sm font-bold uppercase">{startLine}</p>}
          {startTime && <p className="mt-0.5 text-sm font-bold uppercase">{startTime}</p>}
        </div>

        <div className="space-y-5 px-5">
          {delivered ? (
            <div className="border-success/30 bg-success/12 text-success flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold">
              <CheckCircle2 className="size-5" /> KIT RETIRADO ✓ {formatDateTime(row.delivered_at)}
            </div>
          ) : (
            <div className="border-primary/30 bg-primary/10 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold">
              <Ticket className="size-5" /> KIT PENDENTE DE RETIRADA
            </div>
          )}

          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Dados do atleta
            </p>
            <p className="text-2xl font-extrabold uppercase">{row.name}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Número" value={row.bib_number} strong />
            <Field label="Nascimento" value={row.birth_date ? formatDate(row.birth_date) : null} />
            <Field label="Sexo" value={genderLabel(row.gender)} />
            <div className="min-w-0">
              <dt className="text-muted-foreground text-xs tracking-wide uppercase">Status</dt>
              <dd className={`font-extrabold uppercase ${isPaid ? "text-success" : "text-destructive"}`}>
                {isPaid ? "PAGO" : "PENDENTE PAGAMENTO"}
              </dd>
            </div>
            <Field label="Kit" value={row.kit_type} strong />
            <Field label="Camiseta" value={row.shirt_size} strong />
            <Field label="Modalidade" value={row.modality} />
            <Field label="Categoria" value={row.category} />
            {extras.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} />
            ))}
          </dl>

          {(pickupLines.length > 0 || pickupInfo || mapsHref) && (
            <div className="bg-primary/5 border-primary/20 space-y-3 rounded-xl border p-4">
              <p className="text-primary flex items-center gap-2 text-sm font-bold uppercase">
                <MapPin className="size-5" /> Local da retirada do kit
              </p>
              {pickupInfo && (
                <p className="whitespace-pre-wrap text-sm font-medium">{pickupInfo}</p>
              )}
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {pickupLines.map((l) => (
                  <Field key={l.label} label={l.label} value={l.value} />
                ))}
              </dl>
              {mapsHref && (
                <Button asChild className="w-full" size="lg">
                  <a href={mapsHref} target="_blank" rel="noreferrer">
                    <Navigation className="size-4" /> Como chegar
                  </a>
                </Button>
              )}
            </div>
          )}


        <div className="bg-card flex flex-col items-center gap-3 rounded-xl border p-5">
          <div ref={qrRef}>
            <QRCodeSVG value={scanUrl} size={192} level="M" />
          </div>
          <p className="text-muted-foreground text-center text-xs">
            A equipe de entrega lê este QR Code, confere seus dados e registra o kit como entregue.
          </p>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => void saveCredential("png")}>
              <ImageIcon className="size-4" /> Salvar imagem
            </Button>
            <Button variant="outline" onClick={() => void saveCredential("pdf")}>
              <FileDown className="size-4" /> Salvar PDF
            </Button>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, strong, preserve }: { label: string; value?: string | null; strong?: boolean; preserve?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">{label}</dt>
      <dd className={`${strong ? "text-lg font-bold" : "font-medium"} ${preserve ? "whitespace-pre-wrap" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
