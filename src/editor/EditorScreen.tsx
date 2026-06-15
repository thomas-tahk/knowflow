import { useEffect, useMemo, useRef, useState } from 'react';
import type { KnowflowDoc, Preset, BlockType } from '../core/types';
import { getPreset } from '../core/presets';
import { createDoc } from '../core/createDoc';
import {
  updateBlockText, swapBlockType, deleteBlock, recategorizeCause,
  addBlock, addConnection, removeConnection, setConnectionLabel,
  moveBlock, resizeBlock, resetLayout, renameDoc, setDescription, clearDoc,
} from '../core/operations';
import { DocumentStore } from '../core/persistence';
import { SAMPLES } from '../canvas/samples';
import { DiagramCanvas } from '../canvas/DiagramCanvas';
import { FishboneCanvas } from '../canvas/FishboneCanvas';
import { Palette } from './Palette';
import { Inspector } from './Inspector';
import { EdgeInspector } from './EdgeInspector';
import { DiagramsPanel } from './DiagramsPanel';
import { GeneratePanel } from './GeneratePanel';
import { CanvasCaption } from './CanvasCaption';
import { ValidationHints } from './ValidationHints';
import { useAutosave } from './useAutosave';
import './EditorScreen.css';

const store = new DocumentStore(localStorage);

function seed(preset: Preset): KnowflowDoc {
  return store.load(SAMPLES[preset].id) ?? SAMPLES[preset];
}

export function EditorScreen() {
  const [doc, setDoc] = useState<KnowflowDoc>(() => seed('flowchart'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const status = useAutosave(doc, store);
  const canvasRef = useRef<HTMLDivElement>(null);

  const isFishbone = doc.preset === 'fishbone';
  const connectable = doc.preset === 'flowchart' || doc.preset === 'decisionTree';
  const errors = useMemo(() => getPreset(doc.preset).validate(doc), [doc]);

  const loadDoc = (next: KnowflowDoc) => {
    setDoc(next); setSelectedId(null); setSelectedEdgeId(null); setFocusId(null); setConnectMode(false);
  };
  const newBlank = (preset: Preset) => loadDoc(createDoc(preset, 'Untitled'));
  const openSaved = (id: string) => { const d = store.load(id); if (d) loadDoc(d); };
  const deleteDoc = (id: string) => {
    const summary = store.list().find(s => s.id === id);
    if (!window.confirm(`Delete "${summary?.title || 'this diagram'}"? This can't be undone.`)) return;
    store.remove(id);
    if (id === doc.id) loadDoc(seed('flowchart'));
    else setDoc({ ...doc });
  };
  const clearCanvas = () => {
    if (!window.confirm('Clear this diagram? All blocks will be removed.')) return;
    setDoc(clearDoc(doc)); setSelectedId(null); setSelectedEdgeId(null);
  };

  // Keyboard: C toggles connect mode (graph presets), Esc exits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'Escape') setConnectMode(false);
      else if ((e.key === 'c' || e.key === 'C') && connectable) setConnectMode(m => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [connectable]);

  const doExport = async (kind: 'png' | 'pdf') => {
    setExportOpen(false);
    if (!canvasRef.current) return;
    const { exportPng, exportPdf } = await import('./exporters');
    (kind === 'png' ? exportPng : exportPdf)(canvasRef.current, doc.title);
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

  const rightLabel = selectedEdgeId ? 'Connection' : selectedId ? 'Edit' : 'Add';

  return (
    <div className="editor">
      <header className="topbar">
        <span className="brand">know<b>flow</b></span>
        <span className="preset-tag">{getPreset(doc.preset).name}</span>

        <div className="topbar-right">
          {connectable && (
            <button className={`tbtn ${connectMode ? 'active' : ''}`} onClick={() => setConnectMode(m => !m)}
              title="Connect blocks: click a start, then an end. Shortcut: C">
              {connectMode ? 'Connecting…' : 'Connect'}
            </button>
          )}
          <button className="tbtn ghost" onClick={() => setDoc(resetLayout(doc))}
            title="Snap blocks back to the neat automatic layout — your content stays.">Tidy up</button>
          <button className="tbtn danger" onClick={clearCanvas} title="Remove every block (asks first).">Clear</button>

          <div className="export-wrap">
            <button className="tbtn" onClick={() => setExportOpen(o => !o)}>Export ▾</button>
            {exportOpen && (
              <div className="export-menu" onMouseLeave={() => setExportOpen(false)}>
                <button onClick={() => doExport('png')}>Download PNG</button>
                <button onClick={() => doExport('pdf')}>Download PDF</button>
              </div>
            )}
          </div>
          <span className={`save save-${status}`}>{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : ''}</span>
        </div>
      </header>

      <div className="stage">
        <div className="canvas" ref={canvasRef}>
          <CanvasCaption
            key={doc.id}
            title={doc.title}
            description={doc.description ?? ''}
            onTitle={t => setDoc(renameDoc(doc, t))}
            onDescription={d => setDoc(setDescription(doc, d))}
          />
          {isFishbone ? (
            <FishboneCanvas doc={doc} selectedId={selectedId} onSelect={setSelectedId} focusId={focusId} />
          ) : (
            <DiagramCanvas
              doc={doc}
              editable
              connectable={connectable}
              connectMode={connectMode}
              focusId={focusId}
              selectedEdgeId={selectedEdgeId}
              onSelect={setSelectedId}
              onSelectEdge={setSelectedEdgeId}
              onMove={(id, position) => setDoc(moveBlock(doc, id, position))}
              onResize={(id, size) => setDoc(resizeBlock(doc, id, size))}
              onConnect={(from, to) => setDoc(addConnection(doc, from, to).doc)}
              onDeleteConnection={(id) => { setDoc(removeConnection(doc, id)); setSelectedEdgeId(null); }}
            />
          )}

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
                docs={store.list().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))}
                activeId={doc.id}
                onOpen={openSaved}
                onNew={newBlank}
                onGenerate={() => setShowGenerate(true)}
                onDelete={deleteDoc}
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
              {selectedEdgeId ? (
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
          onGenerated={(generated) => { loadDoc(generated); setShowGenerate(false); }}
        />
      )}
    </div>
  );
}
