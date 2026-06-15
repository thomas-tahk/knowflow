import { useRef, useState } from 'react';
import type { KnowflowDoc, Preset, BlockType } from '../core/types';
import { ALL_PRESETS } from '../core/types';
import { getPreset } from '../core/presets';
import { createDoc } from '../core/createDoc';
import {
  updateBlockText, swapBlockType, deleteBlock, recategorizeCause,
  addBlock, addConnection, moveBlock, resizeBlock, resetLayout, renameDoc,
} from '../core/operations';
import { DocumentStore } from '../core/persistence';
import { SAMPLES } from '../canvas/samples';
import { DiagramCanvas } from '../canvas/DiagramCanvas';
import { FishboneCanvas } from '../canvas/FishboneCanvas';
import { Palette } from './Palette';
import { Inspector } from './Inspector';
import { useAutosave } from './useAutosave';
import './EditorScreen.css';

const store = new DocumentStore(localStorage);

/** Resume the saved version of a preset's sample if one exists, else the pristine sample. */
function seed(preset: Preset): KnowflowDoc {
  return store.load(SAMPLES[preset].id) ?? SAMPLES[preset];
}

export function EditorScreen() {
  const [doc, setDoc] = useState<KnowflowDoc>(() => seed('flowchart'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const status = useAutosave(doc, store);
  const canvasRef = useRef<HTMLDivElement>(null);

  const switchPreset = (preset: Preset) => {
    setDoc(seed(preset));
    setSelectedId(null);
  };

  const newBlank = (preset: Preset) => {
    setDoc(createDoc(preset, 'Untitled'));
    setSelectedId(null);
  };

  const openSaved = (id: string) => {
    const loaded = store.load(id);
    if (loaded) { setDoc(loaded); setSelectedId(null); }
  };

  const doExport = async (kind: 'png' | 'pdf') => {
    if (!canvasRef.current) return;
    // Lazy-load the heavy export libs (jsPDF/html-to-image) only when actually exporting.
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
  };

  const handleDelete = (id: string) => {
    setDoc(deleteBlock(doc, id));
    setSelectedId(null);
  };

  const isFishbone = doc.preset === 'fishbone';

  return (
    <div className="editor">
      <header className="editor-bar">
        <span className="editor-brand">know<b>flow</b></span>
        <input
          className="editor-title-input"
          value={doc.title}
          aria-label="Diagram title"
          onChange={e => setDoc(renameDoc(doc, e.target.value))}
        />

        <div className="editor-tools">
          <select className="editor-menu" value="" aria-label="Load a sample"
            onChange={e => { if (e.target.value) switchPreset(e.target.value as Preset); }}>
            <option value="">Samples…</option>
            {ALL_PRESETS.map(p => <option key={p} value={p}>{getPreset(p).name}</option>)}
          </select>

          <select className="editor-menu" value="" aria-label="New diagram"
            onChange={e => { if (e.target.value) newBlank(e.target.value as Preset); }}>
            <option value="">New…</option>
            {ALL_PRESETS.map(p => <option key={p} value={p}>{getPreset(p).name}</option>)}
          </select>

          <select className="editor-menu" value="" aria-label="Open a saved diagram"
            onChange={e => { if (e.target.value) openSaved(e.target.value); }}>
            <option value="">Open…</option>
            {store.list()
              .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
              .map(s => <option key={s.id} value={s.id}>{s.title || '(untitled)'} · {getPreset(s.preset).name}</option>)}
          </select>

          <button className="editor-export" onClick={() => doExport('png')}>PNG</button>
          <button className="editor-export" onClick={() => doExport('pdf')}>PDF</button>

          <span className={`editor-save editor-save-${status}`}>
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
          </span>
        </div>
      </header>

      <div className="editor-body">
        <Palette
          doc={doc}
          selectedId={selectedId}
          onAdd={handleAdd}
          onReset={() => setDoc(resetLayout(doc))}
        />

        <div className="editor-canvas" ref={canvasRef}>
          {isFishbone ? (
            <FishboneCanvas doc={doc} selectedId={selectedId} onSelect={setSelectedId} />
          ) : (
            <DiagramCanvas
              doc={doc}
              editable
              onSelect={setSelectedId}
              onMove={(id, position) => setDoc(moveBlock(doc, id, position))}
              onResize={(id, size) => setDoc(resizeBlock(doc, id, size))}
            />
          )}
        </div>

        <Inspector
          doc={doc}
          selectedId={selectedId}
          onChangeText={(id, text) => setDoc(updateBlockText(doc, id, text))}
          onChangeType={(id, type) => setDoc(swapBlockType(doc, id, type))}
          onRecategorize={(id, categoryId) => setDoc(recategorizeCause(doc, id, categoryId))}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
