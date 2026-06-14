import type { KnowflowDoc, BlockType } from '../core/types';

export interface LabelBox { id: string; type: BlockType; text: string; cx: number; cy: number; w: number; h: number; }
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
const RIB_RISE = 150;  // vertical rise of a rib above/below the spine
const HEAD_W = 210, HEAD_H = 76;
const CAT_W = 142, CAT_H = 46;
const CAUSE_W = 132, CAUSE_H = 36;
const TWIG_LEN = 26;   // horizontal twig from the rib to a cause label
const PAD = 36;        // viewBox padding
const LEFT = 60;       // spine tail x

// Builds Ishikawa geometry: one horizontal spine into the effect (head) box,
// ribs branching off the spine at distinct joints (alternating above/below),
// and causes as short twigs along each rib. Pure — no DOM, fully testable.
export function fishboneSvgLayout(doc: KnowflowDoc): FishboneGeom {
  const categories = doc.blocks.filter(b => b.type === 'category');
  const spineBlock = doc.blocks.find(b => b.type === 'spine');
  const n = categories.length;
  const spineRight = LEFT + (n + 1) * COL;

  const spine: Seg | null = spineBlock ? { x1: LEFT, y1: 0, x2: spineRight, y2: 0 } : null;
  const head: LabelBox | null = spineBlock
    ? { id: spineBlock.id, type: 'spine', text: spineBlock.text, cx: spineRight + HEAD_W / 2, cy: 0, w: HEAD_W, h: HEAD_H }
    : null;

  const cats: CategoryGeom[] = categories.map((cat, i) => {
    const above = i % 2 === 0;
    const sign = above ? -1 : 1;
    const jx = LEFT + (i + 1) * COL;          // this rib's joint on the spine
    const catCx = jx - RIB_RUN;               // category sits up/down and back toward the tail
    const catCy = sign * RIB_RISE;
    const rib: Seg = { x1: catCx, y1: catCy, x2: jx, y2: 0 };
    const box: LabelBox = { id: cat.id, type: 'category', text: cat.text, cx: catCx, cy: catCy, w: CAT_W, h: CAT_H };

    const causeBlocks = doc.blocks.filter(b => b.type === 'cause' && b.categoryId === cat.id);
    const causes: CauseGeom[] = causeBlocks.map((cz, j) => {
      const t = (j + 1) / (causeBlocks.length + 1); // fraction along the rib, spine -> category
      const px = jx + t * (catCx - jx);
      const py = t * catCy;
      const twig: Seg = { x1: px, y1: py, x2: px - TWIG_LEN, y2: py };
      const cbox: LabelBox = { id: cz.id, type: 'cause', text: cz.text, cx: px - TWIG_LEN - CAUSE_W / 2, cy: py, w: CAUSE_W, h: CAUSE_H };
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
