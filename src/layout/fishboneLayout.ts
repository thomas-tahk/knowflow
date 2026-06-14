import type { KnowflowDoc, Block } from '../core/types';
import type { Positions } from './graphLayout';

const COL = 240;        // horizontal gap between categories
const SPINE_Y = 0;      // spine sits on the centre line
const CAT_OFFSET = 150; // category distance above/below the spine
const CAUSE_GAP = 70;   // gap between stacked causes

export function fishboneLayout(doc: KnowflowDoc): Positions {
  const positions: Positions = {};
  const categories = doc.blocks.filter(b => b.type === 'category');

  categories.forEach((cat, i) => {
    const x = i * COL;
    const above = i % 2 === 0;
    const catY = above ? SPINE_Y - CAT_OFFSET : SPINE_Y + CAT_OFFSET;
    positions[cat.id] = { x, y: catY };

    const causes = doc.blocks.filter((b: Block) => b.type === 'cause' && b.categoryId === cat.id);
    causes.forEach((cause, j) => {
      const step = (j + 1) * CAUSE_GAP;
      // Offset causes outward in BOTH axes so each cause->category bone renders as a diagonal twig.
      positions[cause.id] = { x: x - step * 0.6, y: above ? catY - step : catY + step };
    });
  });

  const spine = doc.blocks.find(b => b.type === 'spine');
  if (spine) {
    positions[spine.id] = { x: Math.max(categories.length, 1) * COL, y: SPINE_Y };
  }
  return positions;
}
