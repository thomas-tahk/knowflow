import type { KnowflowDoc, Block, Preset, BlockType } from '../core/types';
import { createDoc } from '../core/createDoc.js';
import { systemClock, type Clock } from '../core/ids.js';

/** The shape the model emits via the emit_diagram tool (local keys, not final ids). */
export interface DraftBlock { key: string; type: BlockType; text: string; category?: string; }
export interface DraftConnection { from: string; to: string; label?: string; }
export interface DraftDiagram { blocks?: DraftBlock[]; connections?: DraftConnection[]; }

/** Normalize a model draft into a real KnowflowDoc: fresh ids, resolved refs, proper meta. Pure. */
export function buildDoc(draft: DraftDiagram, preset: Preset, title: string, clock: Clock = systemClock): KnowflowDoc {
  const base = createDoc(preset, title, clock); // supplies id + meta (its seeded blocks are replaced below)
  const draftBlocks = draft.blocks ?? [];
  const idByKey = new Map<string, string>();

  const blocks: Block[] = draftBlocks.map(b => {
    const id = clock.newId();
    idByKey.set(b.key, id);
    return { id, type: b.type, text: b.text };
  });
  // second pass: resolve fishbone cause -> category links now that all keys are known
  draftBlocks.forEach((b, i) => {
    if (b.category && idByKey.has(b.category)) blocks[i].categoryId = idByKey.get(b.category);
  });

  // Fishbone must have exactly one spine; add one from the title if the model forgot.
  if (preset === 'fishbone' && !blocks.some(b => b.type === 'spine')) {
    blocks.unshift({ id: clock.newId(), type: 'spine', text: title });
  }

  const connections = (draft.connections ?? [])
    .map(c => ({ id: clock.newId(), from: idByKey.get(c.from) ?? '', to: idByKey.get(c.to) ?? '', label: c.label }))
    .filter(c => c.from && c.to); // drop edges referencing unknown keys

  return { ...base, blocks, connections };
}
