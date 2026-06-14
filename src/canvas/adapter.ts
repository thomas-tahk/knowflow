import { MarkerType, type Node, type Edge } from '@xyflow/react';
import type { KnowflowDoc, BlockType } from '../core/types';
import type { Positions } from '../layout';

export interface KnowflowNodeData extends Record<string, unknown> {
  blockType: BlockType;
  text: string;
}

const MARKER = { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#B6AC9B' };

function nodesFor(doc: KnowflowDoc, positions: Positions): Node<KnowflowNodeData>[] {
  return doc.blocks.map(b => ({
    id: b.id,
    type: 'knowflow',
    position: positions[b.id] ?? { x: 0, y: 0 },
    data: { blockType: b.type, text: b.text },
  }));
}

function graphEdges(doc: KnowflowDoc): Edge[] {
  return doc.connections.map(c => ({
    id: c.id, source: c.from, target: c.to, label: c.label,
    type: 'smoothstep', sourceHandle: 'b', targetHandle: 't', markerEnd: MARKER,
  }));
}

function sequenceEdges(doc: KnowflowDoc): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < doc.blocks.length - 1; i++) {
    const from = doc.blocks[i], to = doc.blocks[i + 1];
    edges.push({
      id: `seq-${from.id}-${to.id}`, source: from.id, target: to.id,
      type: 'smoothstep', sourceHandle: 'b', targetHandle: 't', markerEnd: MARKER,
    });
  }
  return edges;
}

function ribEdges(doc: KnowflowDoc): Edge[] {
  const edges: Edge[] = [];
  const spine = doc.blocks.find(b => b.type === 'spine');
  // type 'floating' = our custom diagonal edge; it computes endpoints from node
  // geometry, so no sourceHandle/targetHandle is set and the line follows the true slant.
  for (const cat of doc.blocks.filter(b => b.type === 'category')) {
    if (spine) {
      edges.push({ id: `rib-${cat.id}-${spine.id}`, source: cat.id, target: spine.id, type: 'floating', markerEnd: MARKER });
    }
    for (const cause of doc.blocks.filter(b => b.type === 'cause' && b.categoryId === cat.id)) {
      edges.push({ id: `rib-${cause.id}-${cat.id}`, source: cause.id, target: cat.id, type: 'floating', markerEnd: MARKER });
    }
  }
  return edges;
}

export function toReactFlow(doc: KnowflowDoc, positions: Positions): { nodes: Node<KnowflowNodeData>[]; edges: Edge[] } {
  const nodes = nodesFor(doc, positions);
  let edges: Edge[];
  switch (doc.preset) {
    case 'flowchart':
    case 'decisionTree': edges = graphEdges(doc); break;
    case 'stepList':     edges = sequenceEdges(doc); break;
    case 'fishbone':     edges = ribEdges(doc); break;
  }
  return { nodes, edges };
}
