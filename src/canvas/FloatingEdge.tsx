import { BaseEdge, getStraightPath, useInternalNode, type EdgeProps } from '@xyflow/react';
import { getEdgeParams } from './edgeParams';

export function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  // Guard: nodes not mounted yet, or not measured on first paint (avoids NaN paths).
  if (!sourceNode || !targetNode) return null;
  if (!sourceNode.measured.width || !targetNode.measured.width) return null;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);
  const [path] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
}
