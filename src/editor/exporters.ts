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

async function capture(element: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
  const width = element.clientWidth;
  const height = element.clientHeight;
  const dataUrl = await toPng(element, {
    backgroundColor: BG, width, height, pixelRatio: 2, cacheBust: true, filter: omitChrome,
  });
  return { dataUrl, width, height };
}

function triggerDownload(dataUrl: string, name: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  a.click();
}

export async function exportPng(element: HTMLElement, title: string): Promise<void> {
  const { dataUrl } = await capture(element);
  triggerDownload(dataUrl, `${slug(title)}.png`);
}

export async function exportPdf(element: HTMLElement, title: string): Promise<void> {
  const { dataUrl, width, height } = await capture(element);
  const orientation = width >= height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [width, height] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
  pdf.save(`${slug(title)}.pdf`);
}
