import dagre from '@dagrejs/dagre';
import type { KnowflowDoc } from '../core/types';
import { effectiveSize } from './sizes';

export interface Positions {
  [blockId: string]: { x: number; y: number };
}

export function graphLayout(doc: KnowflowDoc, rankdir: 'TB' | 'LR' = 'TB'): Positions {
  if (doc.blocks.length === 0) return {};

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, nodesep: 60, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const b of doc.blocks) {
    const { width, height } = effectiveSize(b);
    g.setNode(b.id, { width, height });
  }
  for (const c of doc.connections) {
    if (g.hasNode(c.from) && g.hasNode(c.to)) g.setEdge(c.from, c.to);
  }

  dagre.layout(g);

  const positions: Positions = {};
  for (const b of doc.blocks) {
    const n = g.node(b.id);
    // Dagre reports node centers; React Flow positions by top-left.
    // A manual position override wins over the computed layout.
    positions[b.id] = b.position ?? { x: n.x - n.width / 2, y: n.y - n.height / 2 };
  }
  return positions;
}
