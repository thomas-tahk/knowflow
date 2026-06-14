import { Fragment } from 'react';
import type { KnowflowDoc } from '../core/types';
import { fishboneSvgLayout, type LabelBox } from './fishboneSvgLayout';
import { styleFor } from './blockStyles';
import './FishboneCanvas.css';

interface Props {
  doc: KnowflowDoc;
  selectedId?: string | null;
  onSelect?: (blockId: string | null) => void;
}

export function FishboneCanvas({ doc, selectedId, onSelect }: Props) {
  const g = fishboneSvgLayout(doc);
  const { minX, minY, width, height } = g.viewBox;

  const Box = ({ b, role }: { b: LabelBox; role: 'head' | 'category' | 'cause' }) => {
    const s = styleFor(b.type);
    const selected = selectedId === b.id;
    return (
      <foreignObject x={b.cx - b.w / 2} y={b.cy - b.h / 2} width={b.w} height={b.h}>
        <div
          className={`fb-box fb-${role} ${selected ? 'fb-selected' : ''}`}
          style={{ background: s.bg, borderColor: s.border, color: s.ink }}
          onClick={(e) => { e.stopPropagation(); onSelect?.(b.id); }}
        >
          {b.text}
        </div>
      </foreignObject>
    );
  };

  return (
    <div className="fb-wrap" onClick={() => onSelect?.(null)}>
      <svg className="fb-svg" viewBox={`${minX} ${minY} ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {g.spine && <line className="fb-spine" x1={g.spine.x1} y1={g.spine.y1} x2={g.spine.x2} y2={g.spine.y2} />}
        {g.categories.map((c) => (
          <Fragment key={`line-${c.box.id}`}>
            <line className="fb-rib" x1={c.rib.x1} y1={c.rib.y1} x2={c.rib.x2} y2={c.rib.y2} />
            {c.causes.map((cz) => (
              <line key={`twig-${cz.box.id}`} className="fb-twig" x1={cz.twig.x1} y1={cz.twig.y1} x2={cz.twig.x2} y2={cz.twig.y2} />
            ))}
          </Fragment>
        ))}
        {g.head && <Box b={g.head} role="head" />}
        {g.categories.map((c) => (
          <Fragment key={`box-${c.box.id}`}>
            <Box b={c.box} role="category" />
            {c.causes.map((cz) => <Box key={cz.box.id} b={cz.box} role="cause" />)}
          </Fragment>
        ))}
      </svg>
    </div>
  );
}
