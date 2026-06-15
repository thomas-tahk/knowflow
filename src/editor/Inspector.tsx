import type { KnowflowDoc, BlockType } from '../core/types';
import { getPreset } from '../core/presets';
import { BLOCK_META } from './blockMeta';
import './Inspector.css';

interface Props {
  doc: KnowflowDoc;
  selectedId: string | null;
  onChangeText: (id: string, text: string) => void;
  onChangeType: (id: string, type: BlockType) => void;
  onRecategorize: (id: string, categoryId: string) => void;
  onDelete: (id: string) => void;
}

export function Inspector({ doc, selectedId, onChangeText, onChangeType, onRecategorize, onDelete }: Props) {
  const block = doc.blocks.find(b => b.id === selectedId);
  if (!block) return <p className="inspector-empty">Select a block to edit it.</p>;

  const typeOptions = getPreset(doc.preset).blockTypes.filter(t => t !== 'spine');
  const categories = doc.blocks.filter(b => b.type === 'category');
  const isLoneSpine = block.type === 'spine' && doc.blocks.filter(b => b.type === 'spine').length === 1;

  return (
    <div className="inspector">
      <label className="inspector-field">
        <span>Text</span>
        <textarea value={block.text} rows={3} onChange={e => onChangeText(block.id, e.target.value)} />
      </label>

      {block.type !== 'spine' && (
        <label className="inspector-field">
          <span>Type</span>
          <select value={block.type} onChange={e => onChangeType(block.id, e.target.value as BlockType)}>
            {typeOptions.map(t => <option key={t} value={t}>{BLOCK_META[t].label}</option>)}
          </select>
        </label>
      )}

      {block.type === 'cause' && (
        <label className="inspector-field">
          <span>Category</span>
          <select value={block.categoryId ?? ''} onChange={e => onRecategorize(block.id, e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.text || '(untitled)'}</option>)}
          </select>
        </label>
      )}

      <button
        className="inspector-delete"
        disabled={isLoneSpine}
        title={isLoneSpine ? 'A fishbone needs its effect box' : 'Delete this block'}
        onClick={() => onDelete(block.id)}
      >
        Delete block
      </button>
    </div>
  );
}
