import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, ConnectionMode, useReactFlow, useNodesState,
  type Node, type Edge, type Connection,
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
  editable?: boolean;
  connectable?: boolean;
  focusId?: string | null;
  selectedEdgeId?: string | null;
  onSelect?: (blockId: string | null) => void;
  onSelectEdge?: (edgeId: string | null) => void;
  onMove?: (blockId: string, position: { x: number; y: number }) => void;
  onResize?: (blockId: string, size: { w: number; h: number }) => void;
  onConnect?: (from: string, to: string) => void;
  onDeleteConnection?: (edgeId: string) => void;
}

function Inner(props: Props) {
  const { doc, editable = false, connectable = false, focusId, selectedEdgeId,
    onSelect, onSelectEdge, onMove, onResize, onConnect, onDeleteConnection } = props;
  const { fitView } = useReactFlow();

  const derived = useMemo(() => toReactFlow(doc, layoutDoc(doc)), [doc]);

  const derivedNodes = useMemo<Node<KnowflowNodeData>[]>(() => {
    if (!editable) return derived.nodes;
    return derived.nodes.map(n => ({
      ...n,
      data: { ...n.data, editable: true, onResize: (w: number, h: number) => onResize?.(n.id, { w, h }) },
    }));
  }, [derived.nodes, editable, onResize]);

  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setNodes(derivedNodes); }, [doc, setNodes]);

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 0);
    return () => clearTimeout(t);
  }, [doc.id, fitView]);

  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => fitView({ nodes: [{ id: focusId }], padding: 0.45, maxZoom: 1.25, duration: 400 }), 30);
    return () => clearTimeout(t);
  }, [focusId, fitView]);

  const handleDragStop = useCallback(
    (_: unknown, node: Node) => onMove?.(node.id, { x: node.position.x, y: node.position.y }),
    [onMove],
  );

  const edges: Edge[] = useMemo(
    () => derived.edges.map(e => ({ ...e, selected: e.id === selectedEdgeId })),
    [derived.edges, selectedEdgeId],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      nodesDraggable={editable}
      nodesConnectable={editable && connectable}
      elementsSelectable={true}
      connectionMode={ConnectionMode.Loose}
      onConnect={(c: Connection) => { if (c.source && c.target && c.source !== c.target) onConnect?.(c.source, c.target); }}
      onEdgesDelete={(eds) => eds.forEach(e => onDeleteConnection?.(e.id))}
      onNodeDragStop={editable ? handleDragStop : undefined}
      onSelectionChange={({ nodes: ns, edges: es }) => { onSelect?.(ns[0]?.id ?? null); onSelectEdge?.(es[0]?.id ?? null); }}
      snapToGrid={editable}
      snapGrid={[16, 16]}
      minZoom={0.2}
      maxZoom={2.5}
      fitView
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
