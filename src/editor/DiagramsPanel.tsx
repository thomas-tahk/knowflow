import { useState, type ReactNode } from 'react';
import type { Preset } from '../core/types';
import { ALL_PRESETS } from '../core/types';
import { getPreset } from '../core/presets';
import type { FlowSummary } from '../library/flows';
import { STARTER_GROUPS, STARTER_FLOWS } from '../library/starterFlows';
import './DiagramsPanel.css';

interface Props {
  docs: FlowSummary[];
  activeId: string;
  onOpen: (id: string) => void;
  onNew: (preset: Preset) => void;
  onGenerate: () => void;
  onDelete: (id: string) => void;
}

const TEAM_GROUP = 'Team flows';
/** Starter topics collapsed on first render (session-only). */
const DEFAULT_COLLAPSED = new Set(
  STARTER_GROUPS.filter(g => g.defaultCollapsed).map(g => g.title),
);
/** Curated display order for starters — the registry, not the caller's updatedAt sort. */
const STARTER_ORDER = new Map(STARTER_FLOWS.map((f, i) => [f.id, i]));

interface GroupProps {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function CollapsibleGroup({ title, count, collapsed, onToggle, children }: GroupProps) {
  return (
    <>
      <button type="button" className="dp-group" aria-expanded={!collapsed} onClick={onToggle}>
        <span className={`dp-caret ${collapsed ? 'closed' : ''}`} aria-hidden="true">▾</span>
        <span className="dp-group-title">{title}</span>
        <span className="dp-group-count">{count}</span>
      </button>
      {!collapsed && children}
    </>
  );
}

export function DiagramsPanel({ docs, activeId, onOpen, onNew, onGenerate, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(DEFAULT_COLLAPSED));
  const toggle = (title: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });

  // Starter topics in registry order that actually have flows loaded, then Team flows.
  const starterTitles = STARTER_GROUPS.map(g => g.title).filter(t => docs.some(d => d.group === t));

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

  const mine = docs.filter(d => !d.starter);

  return (
    <div className="dp">
      <button className="dp-primary" onClick={onGenerate}>✨ Generate with AI</button>

      <select className="dp-new" value="" aria-label="New blank diagram"
        onChange={e => { if (e.target.value) onNew(e.target.value as Preset); }}>
        <option value="">+ New blank diagram…</option>
        {ALL_PRESETS.map(p => <option key={p} value={p}>{getPreset(p).name}</option>)}
      </select>

      <div className="dp-scroll">
        {starterTitles.map(title => {
          const flows = docs
            .filter(d => d.group === title)
            .sort((a, b) => (STARTER_ORDER.get(a.id) ?? 0) - (STARTER_ORDER.get(b.id) ?? 0));
          return (
            <CollapsibleGroup key={title} title={title} count={flows.length}
              collapsed={collapsed.has(title)} onToggle={() => toggle(title)}>
              <div className="dp-list">{flows.map(row)}</div>
            </CollapsibleGroup>
          );
        })}

        <CollapsibleGroup title={TEAM_GROUP} count={mine.length}
          collapsed={collapsed.has(TEAM_GROUP)} onToggle={() => toggle(TEAM_GROUP)}>
          <div className="dp-list">
            {mine.length === 0 && <p className="dp-empty">No saved diagrams yet.</p>}
            {mine.map(row)}
          </div>
        </CollapsibleGroup>
      </div>
    </div>
  );
}
