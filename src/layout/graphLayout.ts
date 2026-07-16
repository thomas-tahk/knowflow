import dagre from '@dagrejs/dagre';
import type { KnowflowDoc } from '../core/types';
import { effectiveSize } from './sizes';

export interface Positions {
  [blockId: string]: { x: number; y: number };
}

/** A connection's rendered geometry: dagre's routed polyline (flow coords) plus, for labelled
 *  edges, the point dagre reserved for the label. Present only when neither endpoint was
 *  manually moved (a hand-drag invalidates the pre-computed route). */
export interface EdgeRoute {
  points: { x: number; y: number }[];
  labelPoint?: { x: number; y: number };
}

export interface EdgeRoutes {
  [fromTo: string]: EdgeRoute;
}

export interface GraphLayout {
  positions: Positions;
  edgeRoutes: EdgeRoutes;
}

// Rough px footprint of a rendered edge label (.ge-label: 12px bold, ~7px horizontal padding),
// so dagre reserves room for it and won't route it over a parallel branch.
function labelSize(text: string): { width: number; height: number } {
  return { width: Math.min(220, text.trim().length * 6.6 + 16), height: 22 };
}

/** Full flowchart/decision-tree layout: node positions plus routed edge polylines that bend
 *  around nodes (so arrows don't cut through boxes) with label space reserved. */
export function graphLayoutFull(doc: KnowflowDoc, rankdir: 'TB' | 'LR' = 'TB'): GraphLayout {
  if (doc.blocks.length === 0) return { positions: {}, edgeRoutes: {} };

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, nodesep: 60, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const b of doc.blocks) {
    const { width, height } = effectiveSize(b);
    g.setNode(b.id, { width, height });
  }
  for (const c of doc.connections) {
    if (!g.hasNode(c.from) || !g.hasNode(c.to)) continue;
    // Sizing labelled edges makes dagre spread branches apart to fit the label.
    g.setEdge(c.from, c.to, c.label ? { ...labelSize(c.label), labelpos: 'c' } : {});
  }

  dagre.layout(g);

  const positions: Positions = {};
  for (const b of doc.blocks) {
    const n = g.node(b.id);
    // Dagre reports node centers; React Flow positions by top-left.
    // A manual position override wins over the computed layout.
    positions[b.id] = b.position ?? { x: n.x - n.width / 2, y: n.y - n.height / 2 };
  }

  // Dagre's node centers equal React Flow's flow-space centers, so points map 1:1 to flow
  // coords. Skip any edge touching a manually-moved node — its route would be stale.
  const moved = new Set(doc.blocks.filter(b => b.position).map(b => b.id));
  const edgeRoutes: EdgeRoutes = {};
  for (const c of doc.connections) {
    if (!g.hasEdge(c.from, c.to) || moved.has(c.from) || moved.has(c.to)) continue;
    const e = g.edge(c.from, c.to) as { points?: { x: number; y: number }[]; x?: number; y?: number };
    if (!e?.points?.length) continue;
    const route: EdgeRoute = { points: e.points.map(p => ({ x: p.x, y: p.y })) };
    if (c.label && typeof e.x === 'number' && typeof e.y === 'number') {
      route.labelPoint = { x: e.x, y: e.y };
    }
    edgeRoutes[`${c.from}->${c.to}`] = route;
  }

  return { positions, edgeRoutes };
}

export function graphLayout(doc: KnowflowDoc, rankdir: 'TB' | 'LR' = 'TB'): Positions {
  return graphLayoutFull(doc, rankdir).positions;
}
