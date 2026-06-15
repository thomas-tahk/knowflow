import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useInternalNode, type EdgeProps } from '@xyflow/react';
import { getEdgeParams } from './edgeParams';
import './GraphEdge.css';

/** Flowchart / decision-tree edge: routes to the nearest borders (so it never loops awkwardly),
 *  shows its label, and exposes a delete button when selected. */
export function GraphEdge({ id, source, target, markerEnd, label, selected, data }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t || !s.measured.width || !t.measured.width) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(s, t);
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: sx, sourceY: sy, targetX: tx, targetY: ty,
    sourcePosition: sourcePos, targetPosition: targetPos, borderRadius: 10,
  });
  const onDelete = (data as { onDelete?: (id: string) => void } | undefined)?.onDelete;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd}
        style={{ stroke: selected ? '#0F766E' : '#B6AC9B', strokeWidth: selected ? 2.2 : 1.6 }} />
      {(label || selected) && (
        <EdgeLabelRenderer>
          <div className="ge-tools" style={{ transform: `translate(-50%,-50%) translate(${labelX}px, ${labelY}px)` }}>
            {label && <span className="ge-label">{label}</span>}
            {selected && <button className="ge-del" title="Delete connection" onClick={() => onDelete?.(id)}>×</button>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
