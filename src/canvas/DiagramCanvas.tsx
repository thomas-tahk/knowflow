import { useEffect, useMemo } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow,
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
}

function Inner({ doc, onSelect }: Props) {
  const { fitView } = useReactFlow();
  const { nodes, edges } = useMemo<{ nodes: Node<KnowflowNodeData>[]; edges: Edge[] }>(
    () => toReactFlow(doc, layoutDoc(doc)),
    [doc],
  );

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 0);
    return () => clearTimeout(t);
  }, [doc, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
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
