import { Fragment, useEffect, useRef, useState } from 'react';
import type { KnowflowDoc } from '../core/types';
import { fishboneSvgLayout, type LabelBox } from './fishboneSvgLayout';
import { styleFor } from './blockStyles';
import './FishboneCanvas.css';

interface Props {
  doc: KnowflowDoc;
  selectedId?: string | null;
  onSelect?: (blockId: string | null) => void;
  /** When this changes, the view resets to fit (so a freshly added block is on screen). */
  focusId?: string | null;
}

interface View { scale: number; tx: number; ty: number; }
const clamp = (n: number) => Math.min(3, Math.max(0.3, n));

export function FishboneCanvas({ doc, selectedId, onSelect, focusId }: Props) {
  const g = fishboneSvgLayout(doc);
  const { minX, minY, width, height } = g.viewBox;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  const reset = () => setView({ scale: 1, tx: 0, ty: 0 });
  // Refit when the document changes or a block is targeted (keeps new blocks visible).
  useEffect(reset, [doc.id]);
  useEffect(() => { if (focusId) reset(); }, [focusId]);

  // Non-passive wheel listener so we can zoom toward the cursor without page scroll.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      setView(v => {
        const scale = clamp(v.scale * Math.exp(-e.deltaY * 0.0015));
        const k = scale / v.scale;
        return { scale, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const px = el.clientWidth / 2, py = el.clientHeight / 2;
    setView(v => {
      const scale = clamp(v.scale * factor);
      const k = scale / v.scale;
      return { scale, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k };
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.fb-box')) return; // let block clicks through
    drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setView(v => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved && !(e.target as HTMLElement).closest('.fb-box')) onSelect?.(null);
  };

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
    <div
      className="fb-wrap"
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg
        className="fb-svg"
        viewBox={`${minX} ${minY} ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ transformOrigin: '0 0', transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})` }}
      >
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

      <div className="fb-zoom">
        <button onClick={() => zoomBy(1.2)} title="Zoom in">+</button>
        <button onClick={() => zoomBy(1 / 1.2)} title="Zoom out">−</button>
        <button onClick={reset} title="Fit to view">⤢</button>
      </div>
    </div>
  );
}
