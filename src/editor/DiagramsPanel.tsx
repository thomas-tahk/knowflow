import { useState, type ReactNode } from 'react';
import type { Preset } from '../core/types';
import { ALL_PRESETS } from '../core/types';
import { getPreset } from '../core/presets';
import { orderedTopics, type FlowSummary } from '../library/flows';
import { STARTER_GROUPS } from '../library/starterFlows';
import './DiagramsPanel.css';

interface Props {
  docs: FlowSummary[];
  activeId: string;
  onOpen: (id: string) => void;
  onNew: (preset: Preset) => void;
  onGenerate: () => void;
  onDelete: (id: string) => void;
  /** Move a published flow one place within its topic. The panel hands back the whole
   *  reordered list of ids, because that is what the server rewrites. */
  onReorder: (topic: string, ids: string[]) => void;
  /** Anonymous readers get the list and nothing that writes: no create, no AI, no delete. */
  canEdit: boolean;
}

const DRAFTS_GROUP = 'Drafts';
/** Published topics collapsed on first render (session-only). */
const DEFAULT_COLLAPSED = new Set(
  STARTER_GROUPS.filter(g => g.defaultCollapsed).map(g => g.title),
);

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

export function DiagramsPanel({ docs, activeId, onOpen, onNew, onGenerate, onDelete, onReorder, canEdit }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(DEFAULT_COLLAPSED));
  const toggle = (title: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });

  // Headings come from the flows themselves, so a topic created in the app appears here.
  const topics = orderedTopics(docs);

  /** Swap a flow with its neighbour and hand the whole new order back. */
  const move = (topic: string, flows: FlowSummary[], from: number, to: number) => {
    const ids = flows.map(f => f.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    onReorder(topic, ids);
  };

  const row = (d: FlowSummary, siblings?: { topic: string; flows: FlowSummary[]; index: number }) => (
    <div key={d.id} className={`dp-doc ${d.id === activeId ? 'on' : ''}`} onClick={() => onOpen(d.id)}>
      <div className="dp-doc-main">
        <span className="dp-doc-title">{d.title || '(untitled)'}</span>
        <span className="dp-doc-meta"><span className="dp-chip">{getPreset(d.preset).name}</span></span>
      </div>
      {siblings && canEdit && (
        <span className="dp-move">
          <button className="dp-arrow" title="Move up" aria-label={`Move ${d.title} up`}
            disabled={siblings.index === 0}
            onClick={e => { e.stopPropagation(); move(siblings.topic, siblings.flows, siblings.index, siblings.index - 1); }}>▲</button>
          <button className="dp-arrow" title="Move down" aria-label={`Move ${d.title} down`}
            disabled={siblings.index === siblings.flows.length - 1}
            onClick={e => { e.stopPropagation(); move(siblings.topic, siblings.flows, siblings.index, siblings.index + 1); }}>▼</button>
        </span>
      )}
      {!d.official && canEdit && (
        <button className="dp-del" title="Delete" aria-label="Delete diagram"
          onClick={e => { e.stopPropagation(); onDelete(d.id); }}>×</button>
      )}
    </div>
  );

  const drafts = docs.filter(d => !d.official);

  return (
    <div className="dp">
      {canEdit && (
        <>
          <button className="dp-primary" onClick={onGenerate}>✨ Generate with AI</button>

          <select className="dp-new" value="" aria-label="New blank diagram"
            onChange={e => { if (e.target.value) onNew(e.target.value as Preset); }}>
            <option value="">+ New blank diagram…</option>
            {ALL_PRESETS.map(p => <option key={p} value={p}>{getPreset(p).name}</option>)}
          </select>
        </>
      )}

      <div className="dp-scroll">
        {topics.map(title => {
          const flows = docs
            .filter(d => d.official && d.group === title)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          return (
            <CollapsibleGroup key={title} title={title} count={flows.length}
              collapsed={collapsed.has(title)} onToggle={() => toggle(title)}>
              <div className="dp-list">
                {flows.map((f, index) => row(f, { topic: title, flows, index }))}
              </div>
            </CollapsibleGroup>
          );
        })}

        {(canEdit || drafts.length > 0) && (
          <CollapsibleGroup title={DRAFTS_GROUP} count={drafts.length}
            collapsed={collapsed.has(DRAFTS_GROUP)} onToggle={() => toggle(DRAFTS_GROUP)}>
            <div className="dp-list">
              {drafts.length === 0 && <p className="dp-empty">No drafts yet. New diagrams start here — publish one to add it to the library.</p>}
              {drafts.map(d => row(d))}
            </div>
          </CollapsibleGroup>
        )}
      </div>
    </div>
  );
}
