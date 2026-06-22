import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, ConnectionMode, useReactFlow, useNodesState,
  type Node, type Edge, type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { KnowflowDoc } from '../core/types';
import { layoutDoc } from '../layout';
import { toReactFlow, type KnowflowNodeData } from './adapter';
import { KnowflowNode } from './KnowflowNode';
import { GraphEdge } from './GraphEdge';

// Must be defined outside the component (React Flow requirement).
const nodeTypes = { knowflow: KnowflowNode };
const edgeTypes = { graph: GraphEdge };

interface Props {
  doc: KnowflowDoc;
  editable?: boolean;
  connectable?: boolean;
  connectMode?: boolean;
  focusId?: string | null;
  selectedId?: string | null;
  selectedEdgeId?: string | null;
  onSelect?: (blockId: string | null) => void;
  onSelectEdge?: (edgeId: string | null) => void;
  onMove?: (blockId: string, position: { x: number; y: number }) => void;
  onResize?: (blockId: string, size: { w: number; h: number }) => void;
  onConnect?: (from: string, to: string) => void;
  onDeleteConnection?: (edgeId: string) => void;
}

function Inner(props: Props) {
  const { doc, editable = false, connectable = false, connectMode = false, focusId, selectedId, selectedEdgeId,
    onSelect, onSelectEdge, onMove, onResize, onConnect, onDeleteConnection } = props;
  const { fitView } = useReactFlow();
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { if (!connectMode) setPending(null); }, [connectMode]);

  const derived = useMemo(() => toReactFlow(doc, layoutDoc(doc)), [doc]);

  // `selected` is driven by selectedId so that rebuilding nodes on every doc edit
  // (the effect below) preserves the selection instead of clearing it — otherwise
  // editing a block's text would deselect it and drop focus from the inspector.
  const derivedNodes = useMemo<Node<KnowflowNodeData>[]>(() =>
    derived.nodes.map(n => ({
      ...n,
      selected: n.id === selectedId,
      data: editable
        ? { ...n.data, editable: true, onResize: (w: number, h: number) => onResize?.(n.id, { w, h }) }
        : n.data,
    })),
    [derived.nodes, editable, onResize, selectedId],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setNodes(derivedNodes); }, [doc, selectedId, setNodes]);

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
    () => derived.edges.map(e => ({
      ...e,
      selected: e.id === selectedEdgeId,
      data: { ...(e.data ?? {}), onDelete: onDeleteConnection },
    })),
    [derived.edges, selectedEdgeId, onDeleteConnection],
  );

  // Click-to-connect: first click picks the source, second click links to the target.
  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    if (!connectMode) return;
    setPending(prev => {
      if (!prev) return node.id;
      if (node.id !== prev) onConnect?.(prev, node.id);
      return null;
    });
  }, [connectMode, onConnect]);

  const renderNodes = useMemo(
    () => (connectMode ? nodes.map(n => ({ ...n, className: n.id === pending ? 'kf-pending' : undefined })) : nodes),
    [nodes, connectMode, pending],
  );

  return (
    <ReactFlow
      nodes={renderNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      className={connectMode ? 'kf-connecting' : undefined}
      onNodesChange={onNodesChange}
      nodesDraggable={editable && !connectMode}
      nodesConnectable={editable && connectable}
      elementsSelectable={true}
      deleteKeyCode={null}
      connectionMode={ConnectionMode.Loose}
      onConnect={(c: Connection) => { if (c.source && c.target && c.source !== c.target) onConnect?.(c.source, c.target); }}
      onEdgesDelete={(eds) => eds.forEach(e => onDeleteConnection?.(e.id))}
      onNodeClick={handleNodeClick}
      onPaneClick={() => setPending(null)}
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
      <Controls position="bottom-center" showInteractive={false} />
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
