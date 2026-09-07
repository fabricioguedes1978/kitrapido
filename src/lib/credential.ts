/** Voucher do atleta (imagem PNG ou PDF) com cabeçalho do evento, dados e QR Code. */

export type CredentialRow = { label: string; value: string };

export type CredentialData = {
  eventName: string;
  /** Linhas do cabeçalho verde (local e horário de largada), em caixa alta. */
  headerLines?: string[];
  name: string;
  rows: CredentialRow[];
  /** Bloco separado com o local da retirada do kit. */
  pickup?: { title?: string; lines: CredentialRow[]; note?: string } | undefined;
  footer?: string;
};

async function svgToImage(svg: SVGElement, size: number) {
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  const xml = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
  const img = new Image();
  img.width = size;
  img.height = size;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("QR"));
    img.src = url;
  });
  return img;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    // preserve blank lines between paragraphs
    if (paragraph.trim() === "" && paragraphs.length > 1) lines.push("");
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Ícone de localização (pin) desenhado no canvas. */
function pin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const r = size / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, Math.PI, 0, false);
  ctx.lineTo(x + r, y + size * 1.35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + r, y + r, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

const GREEN = "#0f7b3f";
const INK = "#111827";
const MUTED = "#6b7280";

export async function buildCredentialCanvas(data: CredentialData, qrSvg: SVGElement) {
  const W = 900;
  const PAD = 48;
  const inner = W - PAD * 2;
  const qrSize = 360;

  // Medição prévia para calcular a altura total
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = "bold 56px Helvetica, Arial, sans-serif";
  const titleLines = wrap(probe, data.eventName.toUpperCase(), inner);
  const headerLines = data.headerLines?.filter(Boolean).map((l) => l.toUpperCase()) ?? [];
  const headerH = 52 + titleLines.length * 64 + headerLines.length * 44 + 44;

  const cols = 2;
  const bibRowIndex = data.rows.findIndex((r) => r.label.toLowerCase().includes("número") || r.label.toLowerCase().includes("numero"));
  const bibRow = bibRowIndex >= 0 ? data.rows[bibRowIndex] : undefined;
  const otherRows = data.rows.filter((_, i) => i !== bibRowIndex);
  const bibH = bibRow ? 110 : 0;
  const dataRowsH = Math.ceil(otherRows.length / cols) * 74;
  const pickupLines = data.pickup?.lines.filter((l) => l.value) ?? [];
  const pickupNote = data.pickup?.note?.trim();
  const pickupWrapped = pickupLines.map((l) => wrap(probe, l.value, inner - 60));
  const noteWrapped = pickupNote ? wrap(probe, pickupNote, inner - 60) : [];
  const pickupTotalLines = pickupWrapped.reduce((sum, lines) => sum + Math.max(lines.length, 1), 0);
  const noteTotalLines = noteWrapped.length;
  const pickupH = (pickupLines.length || noteTotalLines)
    ? 36 + 46 + pickupTotalLines * 38 + pickupLines.length * 24 + (noteTotalLines ? 18 + noteTotalLines * 32 : 0) + 28
    : 0;

  const H =
    headerH + 46 + 62 + bibH + dataRowsH + 34 + (pickupH ? pickupH + 34 : 0) + qrSize + 130;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  /* ----- Cabeçalho verde, centralizado, caixa alta e negrito ----- */
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, headerH);
  ctx.textAlign = "center";
  let y = 52;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px Helvetica, Arial, sans-serif";
  for (const line of titleLines) {
    y += 58;
    ctx.fillText(line, W / 2, y);
  }
  ctx.font = "bold 32px Helvetica, Arial, sans-serif";
  for (const line of headerLines) {
    y += 44;
    ctx.fillText(line, W / 2, y);
  }
  ctx.textAlign = "left";

  /* ----- Dados do atleta ----- */
  let cursor = headerH + 46;
  ctx.fillStyle = GREEN;
  ctx.font = "bold 20px Helvetica, Arial, sans-serif";
  ctx.fillText("DADOS DO ATLETA", PAD, cursor);
  cursor += 44;
  ctx.fillStyle = INK;
  ctx.font = "bold 40px Helvetica, Arial, sans-serif";
  ctx.fillText(wrap(ctx, data.name.toUpperCase(), inner)[0] ?? "", PAD, cursor);
  cursor += 26;

  /* ----- Número de peito em destaque ----- */
  if (bibRow) {
    const bibValue = (bibRow.value || "—").toUpperCase();
    ctx.fillStyle = MUTED;
    ctx.font = "19px Helvetica, Arial, sans-serif";
    ctx.fillText("NÚMERO", PAD, cursor + 30);
    ctx.fillStyle = INK;
    ctx.font = `bold 56px Helvetica, Arial, sans-serif`;
    const bibText = wrap(ctx, bibValue, inner)[0] ?? bibValue;
    ctx.fillText(bibText.slice(0, 16), PAD, cursor + 84);
    cursor += bibH;
  }

  const colW = inner / cols;
  otherRows.forEach((row, i) => {
    const col = i % cols;
    const idx = Math.floor(i / cols);
    const x = PAD + col * colW;
    const yy = cursor + idx * 74 + 34;
    ctx.fillStyle = MUTED;
    ctx.font = "19px Helvetica, Arial, sans-serif";
    ctx.fillText(row.label.toUpperCase(), x, yy);
    ctx.fillStyle = INK;
    ctx.font = "bold 26px Helvetica, Arial, sans-serif";
    ctx.fillText((wrap(ctx, row.value, colW - 16)[0] ?? row.value).slice(0, 34), x, yy + 32);
  });
  cursor += dataRowsH + 34;

  /* ----- Local da retirada do kit ----- */
  if (pickupLines.length || noteTotalLines) {
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 2;
    roundRect(ctx, PAD, cursor, inner, pickupH, 18);
    ctx.stroke();
    ctx.fillStyle = "#f0fdf4";
    ctx.fill();

    pin(ctx, PAD + 26, cursor + 26, 30, GREEN);
    ctx.fillStyle = GREEN;
    ctx.font = "bold 24px Helvetica, Arial, sans-serif";
    ctx.fillText((data.pickup?.title ?? "LOCAL DA RETIRADA DO KIT").toUpperCase(), PAD + 76, cursor + 52);

    let py = cursor + 86;
    pickupLines.forEach((line, i) => {
      ctx.fillStyle = MUTED;
      ctx.font = "18px Helvetica, Arial, sans-serif";
      ctx.fillText(line.label.toUpperCase(), PAD + 26, py + 18);
      ctx.fillStyle = INK;
      ctx.font = "bold 24px Helvetica, Arial, sans-serif";
      const wrapped = pickupWrapped[i] ?? [line.value];
      for (const textLine of wrapped) {
        ctx.fillText(textLine.slice(0, 52), PAD + 26, py + 48);
        py += 32;
      }
      py += 24;
    });

    if (noteTotalLines) {
      ctx.fillStyle = INK;
      ctx.font = "bold 22px Helvetica, Arial, sans-serif";
      for (const textLine of noteWrapped) {
        ctx.fillText(textLine.slice(0, 80), PAD + 26, py + 32);
        py += 32;
      }
    }

    cursor += pickupH + 34;
  }

  /* ----- QR Code ----- */
  const img = await svgToImage(qrSvg, qrSize);
  const qrX = (W - qrSize) / 2;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  roundRect(ctx, qrX - 20, cursor - 20, qrSize + 40, qrSize + 40, 16);
  ctx.stroke();
  ctx.drawImage(img, qrX, cursor, qrSize, qrSize);
  cursor += qrSize + 62;

  ctx.fillStyle = "#374151";
  ctx.font = "bold 22px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(data.footer ?? "Apresente este QR Code na retirada do kit", W / 2, cursor);
  ctx.textAlign = "left";

  return canvas;
}

export async function downloadCredentialPng(data: CredentialData, qrSvg: SVGElement, filename: string) {
  const canvas = await buildCredentialCanvas(data, qrSvg);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}

export async function downloadCredentialPdf(data: CredentialData, qrSvg: SVGElement, filename: string) {
  const canvas = await buildCredentialCanvas(data, qrSvg);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageW / canvas.width, pageH / canvas.height) * 0.92;
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
  pdf.save(filename);
}
