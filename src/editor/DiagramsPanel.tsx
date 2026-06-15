import type { Preset } from '../core/types';
import { ALL_PRESETS } from '../core/types';
import { getPreset } from '../core/presets';
import type { DocSummary } from '../core/persistence';
import './DiagramsPanel.css';

interface Props {
  docs: DocSummary[];
  activeId: string;
  onOpen: (id: string) => void;
  onNew: (preset: Preset) => void;
  onGenerate: () => void;
  onDelete: (id: string) => void;
}

export function DiagramsPanel({ docs, activeId, onOpen, onNew, onGenerate, onDelete }: Props) {
  return (
    <div className="dp">
      <button className="dp-primary" onClick={onGenerate}>✨ Generate with AI</button>

      <select className="dp-new" value="" aria-label="New blank diagram"
        onChange={e => { if (e.target.value) onNew(e.target.value as Preset); }}>
        <option value="">+ New blank diagram…</option>
        {ALL_PRESETS.map(p => <option key={p} value={p}>{getPreset(p).name}</option>)}
      </select>

      <div className="dp-list">
        {docs.length === 0 && <p className="dp-empty">No saved diagrams yet.</p>}
        {docs.map(d => (
          <div key={d.id} className={`dp-doc ${d.id === activeId ? 'on' : ''}`} onClick={() => onOpen(d.id)}>
            <div className="dp-doc-main">
              <span className="dp-doc-title">{d.title || '(untitled)'}</span>
              <span className="dp-doc-meta"><span className="dp-chip">{getPreset(d.preset).name}</span></span>
            </div>
            <button className="dp-del" title="Delete" aria-label="Delete diagram"
              onClick={e => { e.stopPropagation(); onDelete(d.id); }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
