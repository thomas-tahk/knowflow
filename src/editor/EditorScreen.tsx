import { useState } from 'react';
import type { KnowflowDoc, Preset, BlockType } from '../core/types';
import { ALL_PRESETS } from '../core/types';
import { getPreset } from '../core/presets';
import {
  updateBlockText, swapBlockType, deleteBlock, recategorizeCause,
  addBlock, addConnection, moveBlock, resizeBlock, resetLayout,
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

  const switchPreset = (preset: Preset) => {
    setDoc(seed(preset));
    setSelectedId(null);
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
        <span className="editor-title">{doc.title}</span>
        <div className="editor-presets">
          {ALL_PRESETS.map(p => (
            <button key={p} className={p === doc.preset ? 'on' : ''} onClick={() => switchPreset(p)}>
              {getPreset(p).name}
            </button>
          ))}
        </div>
        <span className={`editor-save editor-save-${status}`}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
        </span>
      </header>

      <div className="editor-body">
        <Palette
          doc={doc}
          selectedId={selectedId}
          onAdd={handleAdd}
          onReset={() => setDoc(resetLayout(doc))}
        />

        <div className="editor-canvas">
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
