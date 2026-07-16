import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useInternalNode, type EdgeProps } from '@xyflow/react';
import { getEdgeParams } from './edgeParams';
import './GraphEdge.css';

type Pt = { x: number; y: number };

const unit = (a: Pt, b: Pt): Pt => {
  const dx = a.x - b.x, dy = a.y - b.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
};

/** SVG path through dagre's waypoints, with the corners rounded so the route reads smoothly
 *  (like Mermaid) instead of as hard right angles. Corner radius is clamped to the shorter
 *  adjacent segment so tight bends don't overshoot. */
function roundedPath(points: Pt[], radius = 8): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1], p = points[i], next = points[i + 1];
    const r = Math.min(radius, Math.hypot(p.x - prev.x, p.y - prev.y) / 2, Math.hypot(next.x - p.x, next.y - p.y) / 2);
    const a = unit(prev, p), b = unit(next, p);
    d += ` L ${p.x + a.x * r},${p.y + a.y * r} Q ${p.x},${p.y} ${p.x + b.x * r},${p.y + b.y * r}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x},${last.y}`;
  return d;
}

/** Flowchart / decision-tree edge. When dagre supplied a routed polyline (auto-layout) the edge
 *  follows it around other nodes; otherwise it falls back to a floating border-to-border route.
 *  Shows its label and a delete button when selected. */
export function GraphEdge({ id, source, target, markerEnd, label, selected, data }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t || !s.measured.width || !t.measured.width) return null;

  const route = (data as { route?: { points: Pt[]; labelPoint?: Pt } } | undefined)?.route;
  let path: string, labelX: number, labelY: number;
  if (route && route.points.length >= 2) {
    path = roundedPath(route.points);
    const lp = route.labelPoint ?? route.points[Math.floor(route.points.length / 2)];
    labelX = lp.x;
    labelY = lp.y;
  } else {
    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(s, t);
    [path, labelX, labelY] = getSmoothStepPath({
      sourceX: sx, sourceY: sy, targetX: tx, targetY: ty,
      sourcePosition: sourcePos, targetPosition: targetPos, borderRadius: 10,
    });
  }
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
