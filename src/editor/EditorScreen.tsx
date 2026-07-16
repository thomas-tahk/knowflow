import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KnowflowDoc, Preset, BlockType } from '../core/types';
import { getPreset } from '../core/presets';
import { createDoc } from '../core/createDoc';
import {
  updateBlockText, swapBlockType, deleteBlock, recategorizeCause,
  addBlock, addConnection, removeConnection, setConnectionLabel,
  moveBlock, resizeBlock, resetLayout, renameDoc, setDescription, clearDoc,
} from '../core/operations';
import { getDoc, saveDoc, removeDoc, ConflictError } from '../data/library';
import { listFlows, resolveFlow, isStarter, type FlowSummary } from '../library/flows';
import { DiagramCanvas } from '../canvas/DiagramCanvas';
import { FishboneCanvas } from '../canvas/FishboneCanvas';
import { Palette } from './Palette';
import { Inspector } from './Inspector';
import { EdgeInspector } from './EdgeInspector';
import { DiagramsPanel } from './DiagramsPanel';
import { GeneratePanel } from './GeneratePanel';
import { ValidationHints } from './ValidationHints';
import { FeedbackButton } from './FeedbackButton';
import { useAutosave } from './useAutosave';
import { useDocHistory } from './useDocHistory';
import './EditorScreen.css';

export function EditorScreen() {
  const { doc, setDoc, resetDoc, undo, redo, canUndo, canRedo } = useDocHistory(createDoc('flowchart', 'Untitled'));
  const [library, setLibrary] = useState<FlowSummary[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [conflict, setConflict] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  // The server version we last synced with — used to detect a concurrent edit by someone else.
  const lastSynced = useRef<string | null>(null);

  const isFishbone = doc.preset === 'fishbone';
  const connectable = doc.preset === 'flowchart' || doc.preset === 'decisionTree';
  const errors = useMemo(() => getPreset(doc.preset).validate(doc), [doc]);
  const readOnly = isStarter(doc.id);

  // Keep the library list in sync after a save/rename without re-fetching every keystroke.
  const upsertSummary = useCallback((d: KnowflowDoc) => {
    setLibrary(prev => [
      { id: d.id, title: d.title, preset: d.preset, status: d.meta.status, updatedAt: d.meta.updatedAt, starter: false },
      ...prev.filter(s => s.id !== d.id),
    ]);
  }, []);

  const save = useCallback(async (d: KnowflowDoc) => {
    if (isStarter(d.id)) return; // starter flows are read-only
    try {
      await saveDoc(d, lastSynced.current ?? undefined);
      lastSynced.current = d.meta.updatedAt;
      upsertSummary(d);
    } catch (e) {
      if (e instanceof ConflictError) { setConflict(true); throw e; } // surface; leave status not-saved
      throw e;
    }
  }, [upsertSummary]);
  const status = useAutosave(doc, save);

  // Load the shared library on startup: open the most recent diagram, or seed a blank one.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return; booted.current = true;
    (async () => {
      const list = await listFlows();
      const mine = list.filter(f => !f.starter).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      const first = mine[0] ?? list.find(f => f.starter);
      if (first) {
        const d = await resolveFlow(first.id);
        if (d) { resetDoc(d); lastSynced.current = d.meta.updatedAt; }
      }
      setLibrary(list);
      setLoading(false);
    })();
  }, [resetDoc]);

  const switchTo = (next: KnowflowDoc) => {
    resetDoc(next); lastSynced.current = next.meta.updatedAt;
    setSelectedId(null); setSelectedEdgeId(null); setFocusId(null); setConnectMode(false); setConflict(false);
  };

  const takeTheirs = async () => { const theirs = await getDoc(doc.id); if (theirs) switchTo(theirs); setConflict(false); };
  const keepMine = async () => {
    await saveDoc(doc, undefined); // unconditional overwrite
    lastSynced.current = doc.meta.updatedAt; upsertSummary(doc); setConflict(false);
  };
  const newBlank = (preset: Preset) => { const d = createDoc(preset, 'Untitled'); switchTo(d); upsertSummary(d); setHistory([]); };
  const openFlow = async (id: string) => { const d = await resolveFlow(id); if (d) { switchTo(d); setHistory([]); } };
  const follow = async (targetId: string) => {
    const target = await resolveFlow(targetId);
    if (!target) return; // broken/missing link: safe no-op
    setHistory(h => [...h, doc.id]);
    switchTo(target);
  };
  const goBack = async () => {
    if (!history.length) return;
    const prevId = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    const d = await resolveFlow(prevId);
    if (d) switchTo(d);
  };
  const handleDeleteDoc = async (id: string) => {
    const summary = library.find(s => s.id === id);
    if (!window.confirm(`Delete "${summary?.title || 'this diagram'}"? This can't be undone.`)) return;
    await removeDoc(id);
    const rest = library.filter(s => s.id !== id);
    setLibrary(rest);
    if (id === doc.id) { if (rest.length) openFlow(rest[0].id); else newBlank('flowchart'); }
  };
  const clearCanvas = () => {
    if (!window.confirm('Clear this diagram? All blocks will be removed.')) return;
    setDoc(clearDoc(doc)); setSelectedId(null); setSelectedEdgeId(null);
  };

  // Keyboard: Cmd/Ctrl+Z undo, +Shift redo; C toggles connect mode; Esc exits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return; // let fields handle their own
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
      if (e.key === 'Escape') setConnectMode(false);
      else if ((e.key === 'c' || e.key === 'C') && connectable) setConnectMode(m => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [connectable, undo, redo]);

  const doExport = async (kind: 'png' | 'pdf') => {
    setMoreOpen(false);
    if (!canvasRef.current) return;
    const { exportPng, exportPdf } = await import('./exporters');
    (kind === 'png' ? exportPng : exportPdf)(canvasRef.current, doc.title, doc.description ?? '');
  };

  const handleAdd = (type: BlockType) => {
    // Fishbone causes always attach to a category — to the selected one, the most recent,
    // or a freshly created one — so adding a cause never silently does nothing.
    if (isFishbone && type === 'cause') {
      const sel = doc.blocks.find(b => b.id === selectedId);
      let categoryId = sel?.type === 'category' ? sel.id
        : [...doc.blocks].reverse().find(b => b.type === 'category')?.id ?? null;
      let working = doc;
      if (!categoryId) {
        const cat = addBlock(working, 'New category', 'category');
        working = cat.doc; categoryId = cat.blockId;
      }
      const cause = addBlock(working, 'New cause', 'cause');
      setDoc(recategorizeCause(cause.doc, cause.blockId, categoryId));
      setSelectedId(cause.blockId); setFocusId(cause.blockId);
      return;
    }

    const { doc: added, blockId } = addBlock(doc, `New ${type}`, type);
    let next = added;
    const sel = doc.blocks.find(b => b.id === selectedId);
    if (connectable && sel) next = addConnection(added, sel.id, blockId).doc;
    setDoc(next); setSelectedId(blockId); setFocusId(blockId);
  };

  const handleDelete = (id: string) => { setDoc(deleteBlock(doc, id)); setSelectedId(null); };

  // Canvas callbacks must keep a stable identity across renders. They feed the `edges`
  // and node arrays React Flow consumes as controlled props; a new reference each render
  // makes React Flow re-sync its store every render, which (with onSelectionChange writing
  // selection back) loops until React aborts with #185 ("Maximum update depth exceeded").
  // Functional setDoc updates let these avoid depending on `doc`, so they never change.
  const handleMove = useCallback((id: string, position: { x: number; y: number }) =>
    setDoc(d => moveBlock(d, id, position)), [setDoc]);
  const handleResize = useCallback((id: string, size: { w: number; h: number }) =>
    setDoc(d => resizeBlock(d, id, size)), [setDoc]);
  const handleCanvasConnect = useCallback((from: string, to: string) =>
    setDoc(d => addConnection(d, from, to).doc), [setDoc]);
  const handleDeleteConnection = useCallback((id: string) => {
    setDoc(d => removeConnection(d, id)); setSelectedEdgeId(null);
  }, [setDoc]);

  const rightLabel = selectedEdgeId ? 'Connection' : selectedId ? 'Edit' : 'Add';

  if (loading) return <div className="editor-loading">Loading your diagrams…</div>;

  return (
    <div className="editor">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">know<b>flow</b></span>
          <span className="preset-tag">{getPreset(doc.preset).name}</span>
        </div>

        <div className="topbar-center">
          <input className="doc-title" value={doc.title} placeholder="Untitled diagram" readOnly={readOnly}
            aria-label="Diagram title" onChange={e => setDoc(renameDoc(doc, e.target.value))} />
          <input className="doc-desc" value={doc.description ?? ''} placeholder="Add a description — what is this & when do you use it?" readOnly={readOnly}
            aria-label="Diagram description" onChange={e => setDoc(setDescription(doc, e.target.value))} />
        </div>

        <div className="topbar-right">
          <button className="tbtn icon" onClick={undo} disabled={!canUndo} title="Undo (⌘/Ctrl+Z)">↶</button>
          <button className="tbtn icon" onClick={redo} disabled={!canRedo} title="Redo (⌘/Ctrl+Shift+Z)">↷</button>
          {connectable && !readOnly && (
            <button className={`tbtn ${connectMode ? 'active' : ''}`} onClick={() => setConnectMode(m => !m)}
              title="Connect blocks: click a start, then an end. Shortcut: C">
              {connectMode ? 'Connecting…' : 'Connect'}
            </button>
          )}
          {readOnly ? (
            <span className="save save-readonly" title="Starter flows are read-only.">Starter · read-only</span>
          ) : (
            <span className={`save save-${status}`} role="status" aria-live="polite"
              title="Your changes save automatically to the shared library.">
              {status === 'saving' ? 'Saving…' : status === 'error' ? '⚠ Not saved' : 'Saved ✓'}
            </span>
          )}

          <div className="more-wrap">
            <button className="tbtn" onClick={() => setMoreOpen(o => !o)}
              aria-haspopup="true" aria-expanded={moreOpen} title="More actions">⋯ More</button>
            {moreOpen && (
              <div className="more-menu" onMouseLeave={() => setMoreOpen(false)}>
                {!readOnly && (
                  <button onClick={() => { setDoc(resetLayout(doc)); setMoreOpen(false); }}
                    title="Snap blocks back to the neat automatic layout — your content stays.">Tidy up layout</button>
                )}
                <button onClick={() => doExport('png')}>Download PNG</button>
                <button onClick={() => doExport('pdf')}>Download PDF</button>
                <FeedbackButton className="more-item" label="💬 Send feedback" onOpen={() => setMoreOpen(false)}
                  context={`${getPreset(doc.preset).name} · ${doc.title || 'Untitled'}`} />
                {!readOnly && (
                  <button className="danger" onClick={() => { setMoreOpen(false); clearCanvas(); }}
                    title="Remove every block (asks first).">Clear all blocks</button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="stage">
        <div className="canvas" ref={canvasRef}>
          {isFishbone ? (
            <FishboneCanvas doc={doc} selectedId={selectedId} onSelect={setSelectedId} focusId={focusId} />
          ) : (
            <DiagramCanvas
              doc={doc}
              editable={!readOnly}
              connectable={connectable}
              connectMode={connectMode}
              focusId={focusId}
              selectedId={selectedId}
              selectedEdgeId={selectedEdgeId}
              onSelect={setSelectedId}
              onSelectEdge={setSelectedEdgeId}
              onMove={handleMove}
              onResize={handleResize}
              onConnect={handleCanvasConnect}
              onDeleteConnection={handleDeleteConnection}
              onFollow={follow}
            />
          )}

          {history.length > 0 && (
            <button className="flow-backbar" onClick={goBack}>
              <span className="flow-backbar-arrow" aria-hidden="true">←</span>
              Back to <b>{library.find(s => s.id === history[history.length - 1])?.title ?? 'previous flow'}</b>
            </button>
          )}

          <div className="canvas-hint" aria-hidden="true">Scroll to zoom · drag to pan</div>

          {connectMode && (
            <div className="connect-banner">Connect mode — click a start block, then an end block. <b>C</b> or <b>Esc</b> to exit.</div>
          )}
        </div>

        {/* Left: diagrams library */}
        {leftOpen ? (
          <aside className="panel panel-left">
            <div className="panel-head">
              <span>Diagrams</span>
              <button className="panel-collapse" title="Hide" onClick={() => setLeftOpen(false)}>◂</button>
            </div>
            <div className="panel-body">
              <DiagramsPanel
                docs={[...library].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))}
                activeId={doc.id}
                onOpen={openFlow}
                onNew={newBlank}
                onGenerate={() => setShowGenerate(true)}
                onDelete={handleDeleteDoc}
              />
            </div>
          </aside>
        ) : (
          <button className="panel-tab panel-tab-left" onClick={() => setLeftOpen(true)}>▸ Diagrams</button>
        )}

        {/* Right: context-aware Connection / Edit / Add */}
        {rightOpen ? (
          <aside className="panel panel-right">
            <div className="panel-head">
              <span>{rightLabel}</span>
              <button className="panel-collapse" title="Hide" onClick={() => setRightOpen(false)}>▸</button>
            </div>
            <div className="panel-body">
              {readOnly ? (
                <div className="ro-note">
                  <p><b>Starter flow — read-only.</b></p>
                  <p>This is a curated reference flow. Editing your own copy comes next; for now, follow the ↗ links and use Back to return.</p>
                </div>
              ) : selectedEdgeId ? (
                <EdgeInspector
                  doc={doc}
                  edgeId={selectedEdgeId}
                  onChangeLabel={(id, label) => setDoc(setConnectionLabel(doc, id, label))}
                  onDelete={(id) => { setDoc(removeConnection(doc, id)); setSelectedEdgeId(null); }}
                />
              ) : selectedId ? (
                <Inspector
                  doc={doc}
                  selectedId={selectedId}
                  onChangeText={(id, text) => setDoc(updateBlockText(doc, id, text))}
                  onChangeType={(id, type) => setDoc(swapBlockType(doc, id, type))}
                  onRecategorize={(id, categoryId) => setDoc(recategorizeCause(doc, id, categoryId))}
                  onDelete={handleDelete}
                />
              ) : (
                <Palette doc={doc} selectedId={selectedId} onAdd={handleAdd} onReset={() => setDoc(resetLayout(doc))} />
              )}
            </div>
          </aside>
        ) : (
          <button className="panel-tab panel-tab-right" onClick={() => setRightOpen(true)}>{rightLabel} ◂</button>
        )}

        <ValidationHints errors={errors} />
      </div>

      {showGenerate && (
        <GeneratePanel
          defaultPreset={doc.preset}
          onClose={() => setShowGenerate(false)}
          onGenerated={(generated) => { switchTo(generated); upsertSummary(generated); setShowGenerate(false); }}
        />
      )}

      {conflict && (
        <div className="conflict-overlay">
          <div className="conflict-modal">
            <h2 className="conflict-title">Someone else changed this diagram</h2>
            <p className="conflict-sub">
              A teammate saved a newer version of “{doc.title || 'Untitled'}” while you were editing.
              Choose how to resolve it:
            </p>
            <div className="conflict-actions">
              <button className="conflict-take" onClick={takeTheirs}>Load theirs<br /><small>discards my changes</small></button>
              <button className="conflict-keep" onClick={keepMine}>Keep mine<br /><small>overwrites theirs</small></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
