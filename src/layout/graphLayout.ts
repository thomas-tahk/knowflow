import dagre from '@dagrejs/dagre';
import type { KnowflowDoc } from '../core/types';
import { effectiveSize } from './sizes';

export interface Positions {
  [blockId: string]: { x: number; y: number };
}

/** Dagre's computed routing polyline per connection, keyed `${from}->${to}`, in flow coords.
 *  Present only for edges whose endpoints sit at the auto-layout position (not manually moved),
 *  since a hand-dragged node invalidates the pre-computed route. */
export interface EdgePoints {
  [fromTo: string]: { x: number; y: number }[];
}

export interface GraphLayout {
  positions: Positions;
  edgePoints: EdgePoints;
}

/** Full flowchart/decision-tree layout: node positions plus the routed edge polylines that
 *  bend around nodes (so arrows don't cut through boxes). */
export function graphLayoutFull(doc: KnowflowDoc, rankdir: 'TB' | 'LR' = 'TB'): GraphLayout {
  if (doc.blocks.length === 0) return { positions: {}, edgePoints: {} };

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

  // Dagre's node centers equal React Flow's flow-space centers, so edge points map 1:1 to
  // flow coords. Skip any edge touching a manually-moved node — its route would be stale.
  const moved = new Set(doc.blocks.filter(b => b.position).map(b => b.id));
  const edgePoints: EdgePoints = {};
  for (const c of doc.connections) {
    if (!g.hasEdge(c.from, c.to) || moved.has(c.from) || moved.has(c.to)) continue;
    const pts = g.edge(c.from, c.to)?.points;
    if (pts?.length) edgePoints[`${c.from}->${c.to}`] = pts.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
  }

  return { positions, edgePoints };
}

export function graphLayout(doc: KnowflowDoc, rankdir: 'TB' | 'LR' = 'TB'): Positions {
  return graphLayoutFull(doc, rankdir).positions;
}
