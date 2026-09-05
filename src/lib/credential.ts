/** Geração da credencial do atleta (imagem PNG ou PDF) com os dados + QR Code. */

export type CredentialData = {
  eventName: string;
  name: string;
  rows: { label: string; value: string }[];
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

export async function buildCredentialCanvas(data: CredentialData, qrSvg: SVGElement) {
  const W = 900;
  // Altura dinâmica: cresce conforme a quantidade de linhas de dados
  const qrSize = 420;
  const dataStart = 300;
  const rowStep = 78;
  const dataEnd = dataStart + data.rows.length * rowStep;
  const H = Math.max(1280, dataEnd + 40 + qrSize + 48 + 190);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Faixa superior verde Kit Rápido
  ctx.fillStyle = "#0f7b3f";
  ctx.fillRect(0, 0, W, 150);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px Helvetica, Arial, sans-serif";
  ctx.fillText("KIT RÁPIDO", 48, 70);
  ctx.font = "24px Helvetica, Arial, sans-serif";
  ctx.fillText(data.eventName.slice(0, 46), 48, 110);

  // Nome do atleta
  ctx.fillStyle = "#111827";
  ctx.font = "bold 46px Helvetica, Arial, sans-serif";
  ctx.fillText(data.name.slice(0, 30), 48, 230);

  // Dados (duas colunas quando houver muitas linhas)
  const twoCol = data.rows.length > 6;
  const colW = (W - 96) / 2;
  data.rows.forEach((row, i) => {
    const col = twoCol ? i % 2 : 0;
    const idx = twoCol ? Math.floor(i / 2) : i;
    const x = 48 + col * colW;
    const yy = dataStart + idx * rowStep;
    ctx.fillStyle = "#6b7280";
    ctx.font = "20px Helvetica, Arial, sans-serif";
    ctx.fillText(row.label.toUpperCase(), x, yy);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 26px Helvetica, Arial, sans-serif";
    ctx.fillText(row.value.slice(0, 34), x, yy + 34);
  });

  // QR Code
  const img = await svgToImage(qrSvg, qrSize);
  const qrX = (W - qrSize) / 2;
  const qrY = H - qrSize - 170;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.strokeRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#374151";
  ctx.font = "22px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    data.footer ?? "Apresente este QR Code na retirada do kit",
    W / 2,
    H - 100,
  );
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
