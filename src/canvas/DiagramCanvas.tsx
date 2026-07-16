import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, ConnectionMode, useReactFlow, useNodesState,
  type Node, type Edge, type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { KnowflowDoc } from '../core/types';
import { layoutDocFull } from '../layout';
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
  onFollow?: (targetId: string) => void;
}

function Inner(props: Props) {
  const { doc, editable = false, connectable = false, connectMode = false, focusId, selectedId, selectedEdgeId,
    onSelect, onSelectEdge, onMove, onResize, onConnect, onDeleteConnection, onFollow } = props;
  const { fitView } = useReactFlow();
  const [pending, setPending] = useState<string | null>(null);
  // Clear the in-progress connection when leaving connect mode. Done during render via
  // the previous-value pattern (not an effect) to avoid a synchronous setState-in-effect.
  const [wasConnectMode, setWasConnectMode] = useState(connectMode);
  if (wasConnectMode !== connectMode) {
    setWasConnectMode(connectMode);
    if (!connectMode) setPending(null);
  }

  const derived = useMemo(() => {
    const { positions, edgePoints } = layoutDocFull(doc);
    return toReactFlow(doc, positions, edgePoints);
  }, [doc]);

  // `selected` is driven by selectedId so that rebuilding nodes on every doc edit
  // (the effect below) preserves the selection instead of clearing it — otherwise
  // editing a block's text would deselect it and drop focus from the inspector.
  const derivedNodes = useMemo<Node<KnowflowNodeData>[]>(() =>
    derived.nodes.map(n => ({
      ...n,
      selected: n.id === selectedId,
      data: {
        ...n.data,
        onFollow,
        ...(editable ? { editable: true, onResize: (w: number, h: number) => onResize?.(n.id, { w, h }) } : {}),
      },
    })),
    [derived.nodes, editable, onResize, onFollow, selectedId],
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

  // Selection is one-directional: clicks set it here. We deliberately do NOT use
  // onSelectionChange to read React Flow's selection back into app state — combined with
  // driving `selected` through the nodes prop, that creates a push/pull feedback loop with
  // no fixed point (React #185 "Maximum update depth"). See KNOWN-ISSUES #1.
  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    // Click-to-connect: first click picks the source, second click links to the target.
    if (connectMode) {
      setPending(prev => {
        if (!prev) return node.id;
        if (node.id !== prev) onConnect?.(prev, node.id);
        return null;
      });
      return;
    }
    onSelect?.(node.id);
    onSelectEdge?.(null);
  }, [connectMode, onConnect, onSelect, onSelectEdge]);

  const handleEdgeClick = useCallback((_: unknown, edge: Edge) => {
    onSelectEdge?.(edge.id);
    onSelect?.(null);
  }, [onSelect, onSelectEdge]);

  const handlePaneClick = useCallback(() => {
    setPending(null);
    onSelect?.(null);
    onSelectEdge?.(null);
  }, [onSelect, onSelectEdge]);

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
      onEdgeClick={handleEdgeClick}
      onPaneClick={handlePaneClick}
      onNodeDragStop={editable ? handleDragStop : undefined}
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
