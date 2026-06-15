import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const BG = '#F6F2EA';

function slug(title: string): string {
  return (title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'diagram');
}

/** Skip React Flow's on-canvas chrome (controls, panels) from the captured image. */
function omitChrome(node: HTMLElement): boolean {
  const cls = node.classList;
  if (!cls) return true;
  return !cls.contains('react-flow__controls')
    && !cls.contains('react-flow__panel')
    && !cls.contains('react-flow__minimap');
}

async function captureRaw(element: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
  const width = element.clientWidth;
  const height = element.clientHeight;
  const dataUrl = await toPng(element, { backgroundColor: BG, width, height, pixelRatio: 2, cacheBust: true, filter: omitChrome });
  return { dataUrl, width, height };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not render the diagram image.'));
    img.src = src;
  });
}

/** Draw the title + description as a header band above the captured diagram. */
async function composeWithHeader(
  raw: { dataUrl: string; width: number; height: number },
  title: string,
  description: string,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(raw.dataUrl);
  const scale = (img.naturalWidth / raw.width) || 2;
  const desc = description.trim();
  const headerH = desc ? 78 : 50; // logical px
  try { await document.fonts.ready; } catch { /* fonts optional */ }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight + headerH * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return raw;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#29281F';
  ctx.font = `600 ${22 * scale}px "Fraunces", Georgia, serif`;
  ctx.fillText(title.trim() || 'Untitled diagram', canvas.width / 2, 33 * scale);
  if (desc) {
    ctx.fillStyle = '#5C564B';
    ctx.font = `500 ${13.5 * scale}px "Hanken Grotesk", system-ui, sans-serif`;
    ctx.fillText(desc, canvas.width / 2, 59 * scale);
  }
  ctx.drawImage(img, 0, headerH * scale);

  return { dataUrl: canvas.toDataURL('image/png'), width: raw.width, height: raw.height + headerH };
}

function triggerDownload(dataUrl: string, name: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  a.click();
}

export async function exportPng(element: HTMLElement, title: string, description = ''): Promise<void> {
  const composed = await composeWithHeader(await captureRaw(element), title, description);
  triggerDownload(composed.dataUrl, `${slug(title)}.png`);
}

export async function exportPdf(element: HTMLElement, title: string, description = ''): Promise<void> {
  const { dataUrl, width, height } = await composeWithHeader(await captureRaw(element), title, description);
  const orientation = width >= height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [width, height] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
  pdf.save(`${slug(title)}.pdf`);
}
