import type { InternalNode, Node } from '@xyflow/react';

// Border-intersection point on `node` of the line toward `target`'s centre.
// Adapted verbatim from the official React Flow v12 floating-edges example.
function getNodeIntersection(node: InternalNode<Node>, target: InternalNode<Node>) {
  const w = (node.measured.width ?? 0) / 2;
  const h = (node.measured.height ?? 0) / 2;
  const x2 = node.internals.positionAbsolute.x + w;
  const y2 = node.internals.positionAbsolute.y + h;
  const x1 = target.internals.positionAbsolute.x + (target.measured.width ?? 0) / 2;
  const y1 = target.internals.positionAbsolute.y + (target.measured.height ?? 0) / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  return { x: w * (xx3 + yy3) + x2, y: h * (-xx3 + yy3) + y2 };
}

export interface EdgeEndpoints { sx: number; sy: number; tx: number; ty: number; }

export function getEdgeParams(source: InternalNode<Node>, target: InternalNode<Node>): EdgeEndpoints {
  const s = getNodeIntersection(source, target);
  const t = getNodeIntersection(target, source);
  return { sx: s.x, sy: s.y, tx: t.x, ty: t.y };
}
