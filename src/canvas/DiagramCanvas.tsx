import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow, useNodesState,
  type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { KnowflowDoc } from '../core/types';
import { layoutDoc } from '../layout';
import { toReactFlow, type KnowflowNodeData } from './adapter';
import { KnowflowNode } from './KnowflowNode';

// Must be defined outside the component (React Flow requirement).
const nodeTypes = { knowflow: KnowflowNode };

interface Props {
  doc: KnowflowDoc;
  onSelect?: (blockId: string | null) => void;
  editable?: boolean;
  onMove?: (blockId: string, position: { x: number; y: number }) => void;
  onResize?: (blockId: string, size: { w: number; h: number }) => void;
}

function Inner({ doc, onSelect, editable = false, onMove, onResize }: Props) {
  const { fitView } = useReactFlow();

  const derived = useMemo(() => toReactFlow(doc, layoutDoc(doc)), [doc]);

  // In editable mode, augment each node with resize handles + a per-node commit callback.
  const derivedNodes = useMemo<Node<KnowflowNodeData>[]>(() => {
    if (!editable) return derived.nodes;
    return derived.nodes.map(n => ({
      ...n,
      data: { ...n.data, editable: true, onResize: (w: number, h: number) => onResize?.(n.id, { w, h }) },
    }));
  }, [derived.nodes, editable, onResize]);

  // React Flow holds transient interaction state; the doc stays the source of truth.
  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  // Re-sync only when the document itself changes (not on every render / callback churn),
  // so an in-progress drag isn't reset mid-gesture. derivedNodes is read fresh inside.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setNodes(derivedNodes); }, [doc, setNodes]);

  // Fit when switching documents — not on every keystroke-level edit.
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 0);
    return () => clearTimeout(t);
  }, [doc.id, fitView]);

  const handleDragStop = useCallback(
    (_: unknown, node: Node) => onMove?.(node.id, { x: node.position.x, y: node.position.y }),
    [onMove],
  );

  const edges: Edge[] = derived.edges;

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      nodesDraggable={editable}
      nodesConnectable={false}
      elementsSelectable={true}
      onNodeDragStop={editable ? handleDragStop : undefined}
      fitView
      onSelectionChange={({ nodes }) => onSelect?.(nodes[0]?.id ?? null)}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={24} size={1.1} color="#D4DDE7" />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export function DiagramCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
