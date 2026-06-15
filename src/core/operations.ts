// src/core/operations.ts
import type { KnowflowDoc, Block, BlockType } from './types';
import { systemClock, type Clock } from './ids';
import { getPreset } from './presets';

function touch(doc: KnowflowDoc, clock: Clock): KnowflowDoc {
  return { ...doc, meta: { ...doc.meta, updatedAt: clock.nowIso() } };
}

export function addBlock(
  doc: KnowflowDoc,
  text: string,
  type?: BlockType,
  clock: Clock = systemClock,
): { doc: KnowflowDoc; blockId: string } {
  const blockType = type ?? getPreset(doc.preset).defaultBlockType;
  const block: Block = { id: clock.newId(), type: blockType, text };
  const next = touch({ ...doc, blocks: [...doc.blocks, block] }, clock);
  return { doc: next, blockId: block.id };
}

export function updateBlockText(doc: KnowflowDoc, blockId: string, text: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(b => (b.id === blockId ? { ...b, text } : b)) }, clock);
}

export function swapBlockType(doc: KnowflowDoc, blockId: string, type: BlockType, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(b => (b.id === blockId ? { ...b, type } : b)) }, clock);
}

export function deleteBlock(doc: KnowflowDoc, blockId: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({
    ...doc,
    blocks: doc.blocks.filter(b => b.id !== blockId),
    connections: doc.connections.filter(c => c.from !== blockId && c.to !== blockId),
  }, clock);
}

export function addConnection(
  doc: KnowflowDoc,
  from: string,
  to: string,
  label?: string,
  clock: Clock = systemClock,
): { doc: KnowflowDoc; connectionId: string } {
  const id = clock.newId();
  const next = touch({ ...doc, connections: [...doc.connections, { id, from, to, label }] }, clock);
  return { doc: next, connectionId: id };
}

export function removeConnection(doc: KnowflowDoc, connectionId: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, connections: doc.connections.filter(c => c.id !== connectionId) }, clock);
}

export function retargetConnection(doc: KnowflowDoc, connectionId: string, newTo: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, connections: doc.connections.map(c => (c.id === connectionId ? { ...c, to: newTo } : c)) }, clock);
}

export function setConnectionLabel(doc: KnowflowDoc, connectionId: string, label: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, connections: doc.connections.map(c => (c.id === connectionId ? { ...c, label } : c)) }, clock);
}

/** Empty the diagram. Keeps a fishbone's single effect/spine so it stays valid. */
export function clearDoc(doc: KnowflowDoc, clock: Clock = systemClock): KnowflowDoc {
  const blocks = doc.preset === 'fishbone' ? doc.blocks.filter(b => b.type === 'spine').slice(0, 1) : [];
  return touch({ ...doc, blocks, connections: [] }, clock);
}

export function recategorizeCause(doc: KnowflowDoc, blockId: string, categoryId: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(b => (b.id === blockId ? { ...b, categoryId } : b)) }, clock);
}

export function renameDoc(doc: KnowflowDoc, title: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, title }, clock);
}

export function moveBlock(doc: KnowflowDoc, blockId: string, position: { x: number; y: number }, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(b => (b.id === blockId ? { ...b, position } : b)) }, clock);
}

export function resizeBlock(doc: KnowflowDoc, blockId: string, size: { w: number; h: number }, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(b => (b.id === blockId ? { ...b, size } : b)) }, clock);
}

export function resetLayout(doc: KnowflowDoc, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(({ position: _p, size: _s, ...b }) => b) }, clock);
}

export function reorderBlock(doc: KnowflowDoc, blockId: string, newIndex: number, clock: Clock = systemClock): KnowflowDoc {
  const blocks = [...doc.blocks];
  const from = blocks.findIndex(b => b.id === blockId);
  if (from === -1) return doc;
  const [moved] = blocks.splice(from, 1);
  blocks.splice(newIndex, 0, moved);
  return touch({ ...doc, blocks }, clock);
}
