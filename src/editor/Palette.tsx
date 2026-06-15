import type { KnowflowDoc, BlockType } from '../core/types';
import { getPreset } from '../core/presets';
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
  const causeNeedsCategory = isFishbone && (selected?.type !== 'category');

  return (
    <aside className="palette">
      <h2 className="palette-title">Add</h2>
      {addable.map(t => {
        const disabled = t === 'cause' && causeNeedsCategory;
        return (
          <button
            key={t}
            className="palette-add"
            disabled={disabled}
            title={disabled ? 'Select a category first' : `Add a ${t}`}
            onClick={() => onAdd(t)}
          >
            + {t}
          </button>
        );
      })}
      <button className="palette-reset" onClick={onReset} title="Clear manual moves/resizes and re-run auto-layout">
        Reset layout
      </button>
    </aside>
  );
}
