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

export function toReactFlow(doc: KnowflowDoc, positions: Positions): { nodes: Node<KnowflowNodeData>[]; edges: Edge[] } {
  const nodes = nodesFor(doc, positions);
  let edges: Edge[];
  switch (doc.preset) {
    case 'flowchart':
    case 'decisionTree': edges = graphEdges(doc); break;
    case 'stepList':     edges = sequenceEdges(doc); break;
    // Fishbone is rendered by FishboneCanvas (custom SVG), not React Flow.
    case 'fishbone':     edges = []; break;
  }
  return { nodes, edges };
}
