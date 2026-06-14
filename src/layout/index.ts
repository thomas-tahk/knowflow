import type { KnowflowDoc } from '../core/types';
import { graphLayout, type Positions } from './graphLayout';
import { linearLayout } from './linearLayout';
import { fishboneLayout } from './fishboneLayout';

export type { Positions } from './graphLayout';

export function layoutDoc(doc: KnowflowDoc): Positions {
  switch (doc.preset) {
    case 'flowchart':
    case 'decisionTree':
      return graphLayout(doc, 'TB');
    case 'stepList':
      return linearLayout(doc);
    case 'fishbone':
      return fishboneLayout(doc);
  }
}
