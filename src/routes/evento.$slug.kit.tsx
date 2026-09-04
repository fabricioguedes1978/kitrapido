import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, FileDown, Image as ImageIcon, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { athleteQrUrl, formatDateTime } from "@/lib/cronochip";
import { customFields } from "@/lib/display";
import { downloadCredentialPdf, downloadCredentialPng } from "@/lib/credential";


export const Route = createFileRoute("/evento/$slug/kit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu Kit — Cronochip" },
      {
        name: "description",
        content:
          "Consulte pelo CPF ou número de inscrição a situação do seu kit e apresente o QR Code na retirada.",
      },
      { property: "og:title", content: "Meu Kit — Cronochip" },
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
  event_name: string;
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

              <div>
                <p className="text-muted-foreground text-xs tracking-wide uppercase">Atleta</p>
                <p className="text-xl font-bold">{result.name}</p>
                <p className="text-muted-foreground text-sm">{result.event_name}</p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Nº de peito" value={result.bib_number} strong />
                <Field label="Modalidade" value={result.modality} />
                <Field label="Categoria" value={result.category} />
                <Field label="Camiseta" value={result.shirt_size} strong />
                <Field label="Kit" value={result.kit_type} />
                {customFields(result.custom_labels, result.custom_values ?? []).map((f) => (
                  <Field key={f.label} label={f.label} value={f.value} />
                ))}
              </dl>

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

function Field({ label, value, strong }: { label: string; value?: string | null; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">{label}</dt>
      <dd className={strong ? "text-lg font-bold" : "font-medium"}>{value || "—"}</dd>
    </div>
  );
}
