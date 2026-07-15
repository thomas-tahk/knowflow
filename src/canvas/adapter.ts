import { MarkerType, type Node, type Edge } from '@xyflow/react';
import type { KnowflowDoc, BlockType } from '../core/types';
import type { Positions } from '../layout';
import { effectiveSize } from '../layout/sizes';

export interface KnowflowNodeData extends Record<string, unknown> {
  blockType: BlockType;
  text: string;
  /** Set by the editable canvas so the node shows resize handles + commits resizes. */
  editable?: boolean;
  onResize?: (width: number, height: number) => void;
  /** Set when this block is a door (Block.linkTo) — clicking the affordance follows it. */
  linkTo?: string;
  onFollow?: (targetId: string) => void;
}

const MARKER = { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#B6AC9B' };

function nodesFor(doc: KnowflowDoc, positions: Positions): Node<KnowflowNodeData>[] {
  return doc.blocks.map(b => {
    const { width, height } = effectiveSize(b);
    return {
      id: b.id,
      type: 'knowflow',
      position: b.position ?? positions[b.id] ?? { x: 0, y: 0 },
      // width/height are node-level so React Flow's NodeResizer can drive them live.
      width,
      height,
      deletable: false, // nodes are deleted via the inspector, not the keyboard
      data: { blockType: b.type, text: b.text, linkTo: b.linkTo },
    };
  });
}

function graphEdges(doc: KnowflowDoc): Edge[] {
  // Real connections: floating 'graph' edges (route to nearest borders), selectable + deletable.
  return doc.connections.map(c => ({
    id: c.id, source: c.from, target: c.to, label: c.label,
    type: 'graph', markerEnd: MARKER, selectable: true, deletable: true,
  }));
}

function sequenceEdges(doc: KnowflowDoc): Edge[] {
  // Step-list order is implicit; these are derived, so they can't be edited individually.
  const edges: Edge[] = [];
  for (let i = 0; i < doc.blocks.length - 1; i++) {
    const from = doc.blocks[i], to = doc.blocks[i + 1];
    edges.push({
      id: `seq-${from.id}-${to.id}`, source: from.id, target: to.id,
      type: 'smoothstep', sourceHandle: 'b', targetHandle: 't', markerEnd: MARKER,
      selectable: false, deletable: false, focusable: false,
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
