import type { KnowflowDoc, BlockType } from '../core/types';
import { getPreset } from '../core/presets';
import { styleFor } from '../canvas/blockStyles';
import { BLOCK_META } from './blockMeta';
import './Palette.css';

interface Props {
  doc: KnowflowDoc;
  selectedId: string | null;
  onAdd: (type: BlockType) => void;
  onReset: () => void;
}

export function Palette({ doc, selectedId, onAdd, onReset }: Props) {
  const isFishbone = doc.preset === 'fishbone';
  // 'spine' is single and seeded, so it is never an "add" option.
  const addable = getPreset(doc.preset).blockTypes.filter(t => t !== 'spine');
  const selected = doc.blocks.find(b => b.id === selectedId);
  const causeNeedsCategory = isFishbone && selected?.type !== 'category';

  const hint = isFishbone
    ? 'Add a category, then select it to add causes under it.'
    : selected
      ? 'New blocks link from the selected one.'
      : 'Tip: select a block first so new ones connect to it.';

  return (
    <div className="palette">
      <p className="palette-hint">{hint}</p>

      {addable.map(t => {
        const meta = BLOCK_META[t];
        const s = styleFor(t);
        const disabled = t === 'cause' && causeNeedsCategory;
        return (
          <button
            key={t}
            className="add-item"
            disabled={disabled}
            title={disabled ? 'Select a category first' : `Add a ${meta.label.toLowerCase()}`}
            onClick={() => onAdd(t)}
          >
            <span className={`add-swatch swatch-${s.shape}`} style={{ background: s.bg, borderColor: s.border }} />
            <span className="add-text">
              <span className="add-name">{meta.label}</span>
              <span className="add-desc">{meta.desc}</span>
            </span>
          </button>
        );
      })}

      <button className="palette-reset" onClick={onReset}
        title="Snap blocks back to the neat automatic layout — your content stays.">
        Tidy up
      </button>
    </div>
  );
}
