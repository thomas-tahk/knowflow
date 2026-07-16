import { Handle, NodeResizer, Position, type NodeProps, type Node } from '@xyflow/react';
import type { KnowflowNodeData } from './adapter';
import { styleFor } from './blockStyles';
import './KnowflowNode.css';

type KNode = Node<KnowflowNodeData, 'knowflow'>;

export function KnowflowNode({ data, selected }: NodeProps<KNode>) {
  const style = styleFor(data.blockType);
  const cssVars = {
    '--bg': style.bg, '--border': style.border, '--ink': style.ink,
  } as React.CSSProperties;

  return (
    <div className={`kf-node kf-${style.shape} ${selected ? 'kf-selected' : ''} ${data.editable ? 'kf-editable' : ''} ${data.linkTo ? 'kf-has-link' : ''}`} style={cssVars}>
      {data.editable && (
        <NodeResizer
          minWidth={90}
          minHeight={40}
          isVisible={!!selected}
          keepAspectRatio={style.shape === 'diamond'}
          lineClassName="kf-resize-line"
          handleClassName="kf-resize-handle"
          onResizeEnd={(_, p) => data.onResize?.(p.width, p.height)}
        />
      )}
      <Handle id="t" type="target" position={Position.Top} />
      <Handle id="l" type="target" position={Position.Left} />
      {style.shape === 'diamond'
        ? <div className="kf-diamond-inner"><span className="kf-label">{data.text}</span></div>
        : <div className="kf-label">{data.text}</div>}
      {data.linkTo && (
        <button
          className="kf-door"
          title="Open the linked flow"
          onClick={(e) => { e.stopPropagation(); data.onFollow?.(data.linkTo!); }}
        >↗</button>
      )}
      <Handle id="b" type="source" position={Position.Bottom} />
      <Handle id="r" type="source" position={Position.Right} />
    </div>
  );
}
