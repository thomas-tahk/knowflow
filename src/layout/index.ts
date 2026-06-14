import type { KnowflowDoc } from '../core/types';
import { graphLayout, type Positions } from './graphLayout';
import { linearLayout } from './linearLayout';

export type { Positions } from './graphLayout';

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
