import { useRef, useState } from 'react';
import type { KnowflowDoc, Preset, BlockType } from '../core/types';
import { createDoc } from '../core/createDoc';
import {
  updateBlockText, swapBlockType, deleteBlock, recategorizeCause,
  addBlock, addConnection, removeConnection, setConnectionLabel,
  moveBlock, resizeBlock, resetLayout, renameDoc, clearDoc,
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
  const [showGenerate, setShowGenerate] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const status = useAutosave(doc, store);
  const canvasRef = useRef<HTMLDivElement>(null);

  const loadDoc = (next: KnowflowDoc) => { setDoc(next); setSelectedId(null); setSelectedEdgeId(null); setFocusId(null); };
  const newBlank = (preset: Preset) => loadDoc(createDoc(preset, 'Untitled'));
  const openSaved = (id: string) => { const d = store.load(id); if (d) loadDoc(d); };
  const deleteDoc = (id: string) => {
    const summary = store.list().find(s => s.id === id);
    if (!window.confirm(`Delete "${summary?.title || 'this diagram'}"? This can't be undone.`)) return;
    store.remove(id);
    if (id === doc.id) loadDoc(seed('flowchart'));
    else setDoc({ ...doc }); // force a re-render so the list refreshes
  };

  const clearCanvas = () => {
    if (!window.confirm('Clear this diagram? All blocks will be removed (this stays in the canvas; nothing else is deleted).')) return;
    setDoc(clearDoc(doc));
    setSelectedId(null);
    setSelectedEdgeId(null);
  };

  const doExport = async (kind: 'png' | 'pdf') => {
    setExportOpen(false);
    if (!canvasRef.current) return;
    const { exportPng, exportPdf } = await import('./exporters');
    (kind === 'png' ? exportPng : exportPdf)(canvasRef.current, doc.title);
  };

  const handleAdd = (type: BlockType) => {
    const { doc: added, blockId } = addBlock(doc, `New ${type}`, type);
    let next = added;
    const selected = doc.blocks.find(b => b.id === selectedId);
    if (type === 'cause' && selected?.type === 'category') {
      next = recategorizeCause(added, blockId, selected.id);
    } else if ((doc.preset === 'flowchart' || doc.preset === 'decisionTree') && selected) {
      next = addConnection(added, selected.id, blockId).doc;
    }
    setDoc(next);
    setSelectedId(blockId);
    setFocusId(blockId); // snap-to-view onto the new block
  };

  const handleDelete = (id: string) => { setDoc(deleteBlock(doc, id)); setSelectedId(null); };

  const isFishbone = doc.preset === 'fishbone';

  return (
    <div className="editor">
      <header className="topbar">
        <span className="brand">know<b>flow</b></span>
        <input className="title-input" value={doc.title} aria-label="Diagram title"
          onChange={e => setDoc(renameDoc(doc, e.target.value))} />

        <div className="topbar-right">
          <button className="tbtn ghost" onClick={() => setDoc(resetLayout(doc))}
            title="Snap blocks back to the neat automatic layout — your content stays.">
            Tidy up
          </button>
          <button className="tbtn danger" onClick={clearCanvas}
            title="Remove every block from this diagram (asks first).">
            Clear
          </button>

          <div className="export-wrap">
            <button className="tbtn" onClick={() => setExportOpen(o => !o)}>Export ▾</button>
            {exportOpen && (
              <div className="export-menu" onMouseLeave={() => setExportOpen(false)}>
                <button onClick={() => doExport('png')}>Download PNG</button>
                <button onClick={() => doExport('pdf')}>Download PDF</button>
              </div>
            )}
          </div>

          <span className={`save save-${status}`}>
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : ''}
          </span>
        </div>
      </header>

      <div className="stage">
        <div className="canvas" ref={canvasRef}>
          {isFishbone ? (
            <FishboneCanvas doc={doc} selectedId={selectedId} onSelect={setSelectedId} focusId={focusId} />
          ) : (
            <DiagramCanvas
              doc={doc}
              editable
              connectable={doc.preset === 'flowchart' || doc.preset === 'decisionTree'}
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

        {/* Right: context-aware Add / Edit */}
        {rightOpen ? (
          <aside className="panel panel-right">
            <div className="panel-head">
              <span>{selectedEdgeId ? 'Connection' : selectedId ? 'Edit' : 'Add'}</span>
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
          <button className="panel-tab panel-tab-right" onClick={() => setRightOpen(true)}>
            {selectedEdgeId ? 'Connection ◂' : selectedId ? 'Edit ◂' : 'Add ◂'}
          </button>
        )}
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
