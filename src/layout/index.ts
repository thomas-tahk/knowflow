import type { KnowflowDoc } from '../core/types';
import { graphLayout, graphLayoutFull, type Positions, type GraphLayout } from './graphLayout';
import { linearLayout } from './linearLayout';

export type { Positions, EdgePoints, GraphLayout } from './graphLayout';

export function layoutDoc(doc: KnowflowDoc): Positions {
  switch (doc.preset) {
    case 'flowchart':
    case 'decisionTree':
      return graphLayout(doc, 'TB');
    case 'stepList':
      return linearLayout(doc);
    case 'fishbone':
      // Fishbone is rendered by its own SVG component (see FishboneCanvas),
      // which computes its own geometry; it does not use React Flow positions.
      return {};
  }
}

/** Like layoutDoc but also returns dagre's routed edge polylines (flowchart/decision-tree only). */
export function layoutDocFull(doc: KnowflowDoc): GraphLayout {
  switch (doc.preset) {
    case 'flowchart':
    case 'decisionTree':
      return graphLayoutFull(doc, 'TB');
    case 'stepList':
      return { positions: linearLayout(doc), edgePoints: {} };
    case 'fishbone':
      return { positions: {}, edgePoints: {} };
  }
}
