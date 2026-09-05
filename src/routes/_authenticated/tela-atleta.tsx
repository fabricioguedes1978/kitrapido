import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImageUp, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_BACKGROUND,
  publishBackground,
  readBackground,
  type DisplayBackground,
} from "@/lib/display";

export const Route = createFileRoute("/_authenticated/tela-atleta")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fundo da Tela do Atleta — Kit Fácil" },
      {
        name: "description",
        content: "Envie uma imagem de fundo personalizada para a tela de conferência do atleta.",
      },
      { property: "og:title", content: "Fundo da Tela do Atleta — Kit Fácil" },
      {
        property: "og:description",
        content: "Personalize o visual do monitor de conferência do atleta.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TelaAtleta,
});

/** Reduz a imagem para caber com folga no armazenamento local do navegador. */
function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const max = 1920;
        const scale = Math.min(1, max / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function TelaAtleta() {
  const [bg, setBg] = useState<DisplayBackground>(DEFAULT_BACKGROUND);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setBg(readBackground()), []);

  function apply(next: DisplayBackground) {
    setBg(next);
    publishBackground(next);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem (JPG, PNG ou WEBP).");
      return;
    }
    setBusy(true);
    try {
      const image = await toDataUrl(file);
      apply({ ...bg, image });
      toast.success("Fundo atualizado na tela do atleta.");
    } catch {
      toast.error("Não foi possível carregar a imagem. Tente outra.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Fundo da Tela do Atleta"
        subtitle="Envie uma imagem para aparecer atrás dos dados na tela de conferência."
        action={
          <Button variant="outline" onClick={() => window.open("/conferencia", "cronochip-display")}>
            <ExternalLink className="size-4" /> Abrir tela
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardContent className="space-y-5 pt-6">
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void onFile(e.dataTransfer.files?.[0]);
              }}
              className="border-primary/40 hover:bg-primary/5 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors"
            >
              <ImageUp className="text-primary size-8" />
              <p className="font-semibold">
                {busy ? "Processando imagem…" : "Clique ou arraste a imagem aqui"}
              </p>
              <p className="text-muted-foreground text-sm">
                JPG, PNG ou WEBP. Ideal em formato deitado (1920×1080).
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] ?? undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dim">Escurecer o fundo: {bg.dim}%</Label>
              <input
                id="dim"
                type="range"
                min={0}
                max={90}
                step={5}
                value={bg.dim}
                onChange={(e) => apply({ ...bg, dim: Number(e.target.value) })}
                className="accent-primary w-full"
              />
              <p className="text-muted-foreground text-xs">
                Aumente para que o texto do atleta fique bem legível sobre a imagem.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              disabled={!bg.image}
              onClick={() => {
                apply(DEFAULT_BACKGROUND);
                toast.success("Fundo padrão restaurado.");
              }}
            >
              <Trash2 className="size-4" /> Remover imagem e voltar ao padrão
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card overflow-hidden">
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-3 text-sm font-medium">Pré-visualização</p>
            <div
              className="bg-dark-gradient relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-cover bg-center p-8"
              style={bg.image ? { backgroundImage: `url(${bg.image})` } : undefined}
            >
              <div
                className="absolute inset-0 bg-black"
                style={{ opacity: bg.image ? bg.dim / 100 : 0 }}
              />
              <div className="relative w-full max-w-3xl text-center text-white">
                <p className="text-xs font-bold tracking-[0.2em] uppercase">Confira seus dados</p>
                <p className="mt-1 text-3xl font-extrabold">Nome do Atleta</p>
                <p className="text-sm opacity-80">Prova Exemplo — Kit Fácil</p>
                <div className="mt-6 grid grid-cols-3 gap-3 text-left">
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-[10px] uppercase opacity-70">Número de peito</p>
                    <p className="text-xl font-extrabold">1234</p>
                  </div>
                  <div className="rounded-xl bg-primary/30 p-3 ring-1 ring-primary/40">
                    <p className="text-[10px] uppercase opacity-90">Kit</p>
                    <p className="text-xl font-extrabold">Completo</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-[10px] uppercase opacity-70">Camiseta</p>
                    <p className="text-xl font-extrabold">M</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-[10px] uppercase opacity-70">Modalidade</p>
                    <p className="text-xl font-extrabold">Corrida</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-[10px] uppercase opacity-70">Categoria</p>
                    <p className="text-xl font-extrabold">Geral</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
