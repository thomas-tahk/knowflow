import type { KnowflowDoc, Block, BlockType } from '../core/types';
import { estimateSize } from '../layout/sizes';

export interface LabelBox { id: string; type: BlockType; text: string; cx: number; cy: number; w: number; h: number; }

/** Size a fishbone label to its text, clamped to keep the diagram tidy. */
function labelSize(text: string, min: number, max: number): { w: number; h: number } {
  const { width, height } = estimateSize(text, 'rect');
  return { w: Math.max(min, Math.min(max, width)), h: height };
}
export interface Seg { x1: number; y1: number; x2: number; y2: number; }
export interface CauseGeom { box: LabelBox; twig: Seg; }
export interface CategoryGeom { box: LabelBox; rib: Seg; causes: CauseGeom[]; }
export interface FishboneGeom {
  spine: Seg | null;
  head: LabelBox | null;
  categories: CategoryGeom[];
  viewBox: { minX: number; minY: number; width: number; height: number };
}

const COL = 210;       // x distance between rib joints along the spine
const RIB_RUN = 70;    // horizontal run of a rib (joint.x - category.x)
const MIN_RISE = 120;  // shortest a rib gets, so sparse categories aren't cramped
const FIRST = 34;      // gap from the spine to the first cause's near edge
const GAP = 16;        // vertical gap between stacked cause boxes (and before the category)
const HEAD_W = 210, HEAD_H = 76;
const CAT_W = 142;   // minimum category width (grows to fit text)
const CAUSE_W = 132; // minimum cause width (grows to fit text)
const TWIG_LEN = 26;   // horizontal twig from the rib to a cause label
const PAD = 36;        // viewBox padding
const LEFT = 60;       // spine tail x

// Builds Ishikawa geometry: one horizontal spine into the effect (head) box,
// ribs branching off the spine at distinct joints (alternating above/below),
// and causes as short twigs along each rib. Causes are stacked by their real
// height (not fractions of a fixed rib), and each rib grows to fit them, so
// labels never overlap. Pure — no DOM, fully testable.
export function fishboneSvgLayout(doc: KnowflowDoc): FishboneGeom {
  const categories = doc.blocks.filter(b => b.type === 'category');
  const spineBlock = doc.blocks.find(b => b.type === 'spine');
  const n = categories.length;
  const spineRight = LEFT + (n + 1) * COL;

  const spine: Seg | null = spineBlock ? { x1: LEFT, y1: 0, x2: spineRight, y2: 0 } : null;
  let head: LabelBox | null = null;
  if (spineBlock) {
    const hs = labelSize(spineBlock.text, HEAD_W, 280);
    head = { id: spineBlock.id, type: 'spine', text: spineBlock.text, cx: spineRight + hs.w / 2, cy: 0, w: hs.w, h: Math.max(HEAD_H, hs.h) };
  }

  // Group causes by their category in one pass, so the per-category work below
  // stays linear overall (not categories × blocks).
  const causesByCat = new Map<string, Block[]>();
  for (const b of doc.blocks) {
    if (b.type === 'cause' && b.categoryId) {
      const list = causesByCat.get(b.categoryId);
      if (list) list.push(b); else causesByCat.set(b.categoryId, [b]);
    }
  }

  const cats: CategoryGeom[] = categories.map((cat, i) => {
    const above = i % 2 === 0;
    const sign = above ? -1 : 1;
    const jx = LEFT + (i + 1) * COL;          // this rib's joint on the spine

    // Stack causes outward from the spine by their real height, tracking each
    // one's centre distance from the spine so nothing overlaps.
    const causeBlocks = causesByCat.get(cat.id) ?? [];
    const causeSizes = causeBlocks.map(cz => labelSize(cz.text, CAUSE_W, 190));
    const centres: number[] = [];
    let edge = FIRST;                          // running outer edge, distance from spine
    for (const zs of causeSizes) {
      centres.push(edge + zs.h / 2);
      edge += zs.h + GAP;
    }

    // The category sits just beyond the last cause; the rib reaches it.
    const cs = labelSize(cat.text, CAT_W, 200);
    const rise = Math.max(MIN_RISE, edge + cs.h / 2);
    const catCx = jx - RIB_RUN;               // category sits up/down and back toward the tail
    const catCy = sign * rise;
    const rib: Seg = { x1: catCx, y1: catCy, x2: jx, y2: 0 };
    const box: LabelBox = { id: cat.id, type: 'category', text: cat.text, cx: catCx, cy: catCy, w: cs.w, h: cs.h };

    const causes: CauseGeom[] = causeBlocks.map((cz, j) => {
      const t = centres[j] / rise;             // fraction along the rib (keeps the cause on it)
      const px = jx + t * (catCx - jx);
      const py = sign * centres[j];
      const zs = causeSizes[j];
      const twig: Seg = { x1: px, y1: py, x2: px - TWIG_LEN, y2: py };
      const cbox: LabelBox = { id: cz.id, type: 'cause', text: cz.text, cx: px - TWIG_LEN - zs.w / 2, cy: py, w: zs.w, h: zs.h };
      return { box: cbox, twig };
    });
    return { box, rib, causes };
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const ext = (x: number, y: number) => { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; };
  const extBox = (b: LabelBox) => { ext(b.cx - b.w / 2, b.cy - b.h / 2); ext(b.cx + b.w / 2, b.cy + b.h / 2); };
  const extSeg = (s: Seg) => { ext(s.x1, s.y1); ext(s.x2, s.y2); };
  if (spine) extSeg(spine);
  if (head) extBox(head);
  for (const c of cats) { extBox(c.box); extSeg(c.rib); for (const cz of c.causes) { extBox(cz.box); extSeg(cz.twig); } }
  if (!Number.isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

  return {
    spine, head, categories: cats,
    viewBox: { minX: minX - PAD, minY: minY - PAD, width: (maxX - minX) + 2 * PAD, height: (maxY - minY) + 2 * PAD },
  };
}
