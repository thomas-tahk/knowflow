import type { KnowflowDoc } from '../core/types';
import { sizeForShape } from './sizes';
import { styleFor } from '../canvas/blockStyles';
import type { Positions } from './graphLayout';

const GAP = 28;

export function linearLayout(doc: KnowflowDoc): Positions {
  const positions: Positions = {};
  let y = 0;
  for (const b of doc.blocks) {
    const { height } = sizeForShape(styleFor(b.type).shape);
    positions[b.id] = { x: 0, y };
    y += height + GAP;
  }
  return positions;
}
