import type { KnowflowDoc } from '../core/types';
import { effectiveSize } from './sizes';
import type { Positions } from './graphLayout';

const GAP = 28;

export function linearLayout(doc: KnowflowDoc): Positions {
  const positions: Positions = {};
  let y = 0;
  for (const b of doc.blocks) {
    const { height } = effectiveSize(b);
    // A manual position override wins over the computed stack position.
    positions[b.id] = b.position ?? { x: 0, y };
    y += height + GAP;
  }
  return positions;
}
