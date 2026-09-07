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
import { athleteQrUrl, formatDate, formatDateTime, mapsUrl } from "@/lib/cronochip";
import { customFields } from "@/lib/display";
import { downloadCredentialPdf, downloadCredentialPng } from "@/lib/credential";


export const Route = createFileRoute("/evento/$slug/kit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu Kit — Kit Rápido" },
      {
        name: "description",
        content:
          "Consulte pelo CPF ou número de inscrição a situação do seu kit e apresente o QR Code na retirada.",
      },
      { property: "og:title", content: "Meu Kit — Kit Rápido" },
      { property: "og:description", content: "QR Code e dados da retirada do seu kit de corrida." },
    ],
  }),
  component: MeuKit,
});

type KitInfo = {
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
  event_name: string;
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

function MeuKit() {
  const { slug } = Route.useParams();
  const [doc, setDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KitInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotFound(false);
    const { data } = await supabase.rpc("public_kit_lookup", { _slug: slug, _doc: doc.trim() });
    setLoading(false);
    const row = (data as KitInfo[] | null)?.[0] ?? null;
    setResult(row);
    setNotFound(!row);
  }

  const delivered = result && result.kit_status !== "pending" && result.kit_status !== "blocked";
  const eventIdFromPayload = result?.qr_payload?.split(":")[1] ?? "";
  const scanUrl = result ? athleteQrUrl(eventIdFromPayload, result.athlete_id) : "";

  const hm = (v?: string | null) => (v ? v.slice(0, 5) : "");
  const startLine = result
    ? [
        result.start_location || result.event_address,
        result.event_city ? `${result.event_city}${result.event_state ? `/${result.event_state}` : ""}` : null,
      ]
        .filter(Boolean)
        .join(" — ")
    : "";
  const startTime = result
    ? [
        result.event_date ? formatDate(result.event_date) : null,
        hm(result.event_time) ? `LARGADA ${hm(result.event_time)}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const pickupLines = result
    ? [
        { label: "Endereço", value: result.pickup_address || "" },
        { label: "Cidade", value: result.pickup_city || "" },
        { label: "Informações", value: result.pickup_info || "" },
      ].filter((l) => l.value)
    : [];
  const mapsHref = result
    ? mapsUrl(result.pickup_maps_url, result.pickup_address, result.pickup_city)
    : "";


  async function saveCredential(kind: "png" | "pdf") {
    const svg = qrRef.current?.querySelector("svg");
    if (!result || !svg) return;
    const data = {
      eventName: result.event_name,
      headerLines: [startLine, startTime].filter(Boolean),
      name: result.name,
      rows: [
        { label: "Número", value: result.bib_number || "—" },
        { label: "Modalidade", value: result.modality || "—" },
        { label: "Camiseta", value: result.shirt_size || "—" },
        { label: "Kit", value: result.kit_type || "—" },
        ...customFields(result.custom_labels, result.custom_values ?? []).map((f) => ({
          label: f.label,
          value: f.value,
        })),
      ],
      pickup: pickupLines.length ? { title: "Local da retirada do kit", lines: pickupLines } : undefined,
      footer: delivered ? "Kit já retirado" : "Apresente este QR Code na retirada do kit",
    };
    const base = `voucher-${result.name.toLowerCase().replace(/\s+/g, "-")}`;
    try {
      if (kind === "png") await downloadCredentialPng(data, svg, `${base}.png`);
      else await downloadCredentialPdf(data, svg, `${base}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o arquivo. Tente novamente.");
    }
  }


  return (
    <div className="bg-background min-h-screen">
      <header className="mx-auto max-w-xl px-4 py-6">
        <Brand />
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16">
        <h1 className="text-3xl font-extrabold">Meu Kit</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Informe seu CPF ou número de inscrição.
        </p>

        <form onSubmit={search} className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="doc">CPF ou inscrição</Label>
            <Input
              id="doc"
              inputMode="text"
              required
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            Consultar
          </Button>
        </form>

        {notFound && (
          <p className="text-destructive mt-6 text-sm font-medium">
            Não encontramos nenhuma inscrição com esses dados neste evento.
          </p>
        )}

        {result && (
          <Card className="shadow-card mt-6">
            <CardContent className="space-y-5 pt-6">
              {delivered ? (
                <div className="border-success/30 bg-success/12 text-success flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold">
                  <CheckCircle2 className="size-5" /> KIT RETIRADO ✓ {formatDateTime(result.delivered_at)}
                </div>
              ) : (
                <div className="border-primary/30 bg-primary/10 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold">
                  <Ticket className="size-5" /> Seu kit está disponível para retirada
                </div>
              )}

              <div className="bg-primary text-primary-foreground -mx-6 -mt-6 rounded-t-xl px-5 py-6 text-center">
                <p className="text-xl font-extrabold tracking-wide uppercase">{result.event_name}</p>
                {startLine && <p className="mt-1 text-sm font-bold uppercase">{startLine}</p>}
                {startTime && <p className="mt-0.5 text-sm font-bold uppercase">{startTime}</p>}
              </div>

              <div>
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Dados do atleta
                </p>
                <p className="text-2xl font-extrabold uppercase">{result.name}</p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Nº de peito" value={result.bib_number} strong />
                <Field label="Modalidade" value={result.modality} />
                <Field label="Categoria" value={result.category} />
                <Field label="Cidade" value={result.city} />
                <Field label="Camiseta" value={result.shirt_size} strong />
                <Field label="Kit" value={result.kit_type} />
                {customFields(result.custom_labels, result.custom_values ?? []).map((f) => (
                  <Field key={f.label} label={f.label} value={f.value} />
                ))}
              </dl>

              {(pickupLines.length > 0 || mapsHref) && (
                <div className="bg-primary/5 border-primary/20 space-y-3 rounded-xl border p-4">
                  <p className="text-primary flex items-center gap-2 text-sm font-bold uppercase">
                    <MapPin className="size-5" /> Local da retirada do kit
                  </p>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {pickupLines.map((l) => (
                      <Field key={l.label} label={l.label} value={l.value} preserve={l.label === "Informações"} />
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
                  Apresente este QR Code no local de retirada. O atendente lê e o kit é baixado no
                  sistema.
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
        )}
      </main>
    </div>
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
