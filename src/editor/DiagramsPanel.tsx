import type { Preset } from '../core/types';
import { ALL_PRESETS } from '../core/types';
import { getPreset } from '../core/presets';
import type { FlowSummary } from '../library/flows';
import './DiagramsPanel.css';

interface Props {
  docs: FlowSummary[];
  activeId: string;
  onOpen: (id: string) => void;
  onNew: (preset: Preset) => void;
  onGenerate: () => void;
  onDelete: (id: string) => void;
}

export function DiagramsPanel({ docs, activeId, onOpen, onNew, onGenerate, onDelete }: Props) {
  const starters = docs.filter(d => d.starter);
  const mine = docs.filter(d => !d.starter);

  const row = (d: FlowSummary) => (
    <div key={d.id} className={`dp-doc ${d.id === activeId ? 'on' : ''}`} onClick={() => onOpen(d.id)}>
      <div className="dp-doc-main">
        <span className="dp-doc-title">{d.title || '(untitled)'}</span>
        <span className="dp-doc-meta"><span className="dp-chip">{getPreset(d.preset).name}</span></span>
      </div>
      {!d.starter && (
        <button className="dp-del" title="Delete" aria-label="Delete diagram"
          onClick={e => { e.stopPropagation(); onDelete(d.id); }}>×</button>
      )}
    </div>
  );

  return (
    <div className="dp">
      <button className="dp-primary" onClick={onGenerate}>✨ Generate with AI</button>

      <select className="dp-new" value="" aria-label="New blank diagram"
        onChange={e => { if (e.target.value) onNew(e.target.value as Preset); }}>
        <option value="">+ New blank diagram…</option>
        {ALL_PRESETS.map(p => <option key={p} value={p}>{getPreset(p).name}</option>)}
      </select>

      {starters.length > 0 && (
        <>
          <div className="dp-group">Starter flows</div>
          <div className="dp-list">{starters.map(row)}</div>
        </>
      )}

      <div className="dp-group">Team flows</div>
      <div className="dp-list">
        {mine.length === 0 && <p className="dp-empty">No saved diagrams yet.</p>}
        {mine.map(row)}
      </div>
    </div>
  );
}
