import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { KnowflowNodeData } from './adapter';
import { styleFor } from './blockStyles';
import { sizeForShape } from '../layout/sizes';
import './KnowflowNode.css';

type KNode = Node<KnowflowNodeData, 'knowflow'>;

export function KnowflowNode({ data, selected }: NodeProps<KNode>) {
  const style = styleFor(data.blockType);
  const { width, height } = sizeForShape(style.shape);
  const cssVars = {
    '--bg': style.bg, '--border': style.border, '--ink': style.ink,
    width, height,
  } as React.CSSProperties;

  return (
    <div
      className={`kf-node kf-${style.shape} ${selected ? 'kf-selected' : ''}`}
      style={cssVars}
    >
      <Handle id="t" type="target" position={Position.Top} />
      <Handle id="l" type="target" position={Position.Left} />
      <div className="kf-label">{data.text}</div>
      <Handle id="b" type="source" position={Position.Bottom} />
      <Handle id="r" type="source" position={Position.Right} />
    </div>
  );
}
