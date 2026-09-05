import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, CheckCircle2, FileDown, Image as ImageIcon, MapPin, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { athleteQrUrl, formatDate, formatDateTime } from "@/lib/cronochip";
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
  event_id: string;
  event_name: string;
  event_slug: string;
  event_date: string | null;
  event_city: string | null;
  event_state: string | null;
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
    setLoading(true);
    const { data, error } = await supabase.rpc("public_kit_lookup_all", { _doc: doc.trim() });
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
              onChange={(e) => setDoc(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Consultando…" : "Fazer check-in"}
          </Button>
        </form>

        {rows?.length === 0 && (
          <p className="text-destructive mt-6 text-sm font-medium">
            Não encontramos nenhuma inscrição com esse CPF nos eventos ativos.
          </p>
        )}

        <div className="mt-6 space-y-6">
          {rows?.map((row) => <KitCard key={row.athlete_id} row={row} />)}
        </div>
      </main>
    </div>
  );
}

function KitCard({ row }: { row: KitRow }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const delivered = row.kit_status !== "pending" && row.kit_status !== "blocked";
  const scanUrl = athleteQrUrl(row.event_id, row.athlete_id);
  const extras = customFields(row.custom_labels, row.custom_values ?? []);

  async function saveCredential(kind: "png" | "pdf") {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const data = {
      eventName: row.event_name,
      name: row.name,
      rows: [
        { label: "Nº de peito", value: row.bib_number || "—" },
        { label: "Kit", value: row.kit_type || "—" },
        { label: "Camiseta", value: row.shirt_size || "—" },
        { label: "Modalidade", value: row.modality || "—" },
        { label: "Categoria", value: row.category || "—" },
        ...extras.map((f) => ({ label: f.label, value: f.value })),
      ],
      footer: delivered ? "Kit já retirado" : "Apresente este QR Code na retirada do kit",
    };
    const base = `credencial-${row.name.toLowerCase().replace(/\s+/g, "-")}`;
    try {
      if (kind === "png") await downloadCredentialPng(data, svg, `${base}.png`);
      else await downloadCredentialPdf(data, svg, `${base}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o arquivo. Tente novamente.");
    }
  }

  return (
    <Card className="shadow-card">
      <CardContent className="space-y-5 pt-6">
        <div>
          <p className="text-xl font-bold">{row.event_name}</p>
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {row.event_date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" /> {formatDate(row.event_date)}
              </span>
            )}
            {row.event_city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" /> {row.event_city}
                {row.event_state ? `/${row.event_state}` : ""}
              </span>
            )}
          </div>
        </div>

        {delivered ? (
          <div className="border-success/30 bg-success/12 text-success flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold">
            <CheckCircle2 className="size-5" /> KIT RETIRADO ✓ {formatDateTime(row.delivered_at)}
          </div>
        ) : (
          <div className="border-primary/30 bg-primary/10 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold">
            <Ticket className="size-5" /> Kit disponível para retirada
          </div>
        )}

        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Atleta</p>
          <p className="text-2xl font-extrabold">{row.name}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Nº de peito" value={row.bib_number} strong />
          <Field label="Kit" value={row.kit_type} strong />
          <Field label="Camiseta" value={row.shirt_size} strong />
          <Field label="Modalidade" value={row.modality} />
          <Field label="Categoria" value={row.category} />
          <Field label="Cidade" value={row.city} />
          {extras.map((f) => (
            <Field key={f.label} label={f.label} value={f.value} />
          ))}
        </dl>

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
      </CardContent>
    </Card>
  );
}

function Field({ label, value, strong }: { label: string; value?: string | null; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">{label}</dt>
      <dd className={strong ? "text-lg font-bold" : "font-medium"}>{value || "—"}</dd>
    </div>
  );
}
