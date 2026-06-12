// src/core/operations.test.ts
import { describe, it, expect } from 'vitest';
import {
  addBlock, updateBlockText, swapBlockType, deleteBlock,
  addConnection, removeConnection, retargetConnection,
  recategorizeCause, reorderBlock,
} from './operations';
import { createDoc } from './createDoc';
import type { Clock } from './ids';

function fixedClock(): Clock {
  let n = 0;
  return { newId: () => `id${++n}`, nowIso: () => '2026-06-12T12:00:00.000Z' };
}

describe('operations', () => {
  it('addBlock appends a block of the preset default type and does not mutate input', () => {
    const clock = fixedClock();
    const d0 = createDoc('flowchart', 'T', clock);
    const { doc: d1, blockId } = addBlock(d0, 'New step', undefined, clock);
    expect(d0.blocks).toHaveLength(0);          // input untouched
    expect(d1.blocks).toHaveLength(1);
    expect(d1.blocks[0].type).toBe('step');     // flowchart default
    expect(d1.blocks[0].id).toBe(blockId);
    expect(d1.meta.updatedAt).toBe('2026-06-12T12:00:00.000Z');
  });

  it('addBlock honours an explicit type', () => {
    const clock = fixedClock();
    const d0 = createDoc('flowchart', 'T', clock);
    const { doc } = addBlock(d0, 'Q', 'decision', clock);
    expect(doc.blocks[0].type).toBe('decision');
  });

  it('updateBlockText changes only the target', () => {
    const clock = fixedClock();
    let d = createDoc('stepList', 'T', clock);
    d = addBlock(d, 'A', undefined, clock).doc;
    const id = d.blocks[0].id;
    d = updateBlockText(d, id, 'B', clock);
    expect(d.blocks[0].text).toBe('B');
  });

  it('swapBlockType changes a block type', () => {
    const clock = fixedClock();
    let d = createDoc('flowchart', 'T', clock);
    const id = addBlock(d, 'A', 'step', clock).doc.blocks[0].id;
    d = addBlock(d, 'A', 'step', clock).doc;
    d = swapBlockType(d, d.blocks[0].id, 'decision', clock);
    expect(d.blocks[0].type).toBe('decision');
  });

  it('deleteBlock removes the block and any touching connections', () => {
    const clock = fixedClock();
    let d = createDoc('flowchart', 'T', clock);
    d = addBlock(d, 'A', 'step', clock).doc;
    d = addBlock(d, 'B', 'outcome', clock).doc;
    const [a, b] = d.blocks.map(x => x.id);
    d = addConnection(d, a, b, undefined, clock).doc;
    d = deleteBlock(d, a, clock);
    expect(d.blocks.map(x => x.id)).toEqual([b]);
    expect(d.connections).toHaveLength(0);
  });

  it('addConnection / removeConnection / retargetConnection', () => {
    const clock = fixedClock();
    let d = createDoc('flowchart', 'T', clock);
    d = addBlock(d, 'A', 'step', clock).doc;
    d = addBlock(d, 'B', 'outcome', clock).doc;
    d = addBlock(d, 'C', 'outcome', clock).doc;
    const [a, b, c] = d.blocks.map(x => x.id);
    let res = addConnection(d, a, b, 'yes', clock);
    d = res.doc;
    const connId = res.connectionId;
    expect(d.connections[0]).toMatchObject({ from: a, to: b, label: 'yes' });
    d = retargetConnection(d, connId, c, clock);
    expect(d.connections[0].to).toBe(c);
    d = removeConnection(d, connId, clock);
    expect(d.connections).toHaveLength(0);
  });

  it('recategorizeCause moves a cause to another category', () => {
    const clock = fixedClock();
    let d = createDoc('fishbone', 'Effect', clock);
    d = addBlock(d, 'Students', 'category', clock).doc;
    d = addBlock(d, 'Staff', 'category', clock).doc;
    const cats = d.blocks.filter(b => b.type === 'category').map(b => b.id);
    d = addBlock(d, 'A cause', 'cause', clock).doc;
    const causeId = d.blocks.find(b => b.type === 'cause')!.id;
    d = recategorizeCause(d, causeId, cats[0], clock);
    expect(d.blocks.find(b => b.id === causeId)!.categoryId).toBe(cats[0]);
    d = recategorizeCause(d, causeId, cats[1], clock);
    expect(d.blocks.find(b => b.id === causeId)!.categoryId).toBe(cats[1]);
  });

  it('reorderBlock moves a block to a new index', () => {
    const clock = fixedClock();
    let d = createDoc('stepList', 'T', clock);
    d = addBlock(d, 'A', undefined, clock).doc;
    d = addBlock(d, 'B', undefined, clock).doc;
    d = addBlock(d, 'C', undefined, clock).doc;
    const ids = d.blocks.map(b => b.id);
    d = reorderBlock(d, ids[2], 0, clock);
    expect(d.blocks.map(b => b.text)).toEqual(['C', 'A', 'B']);
  });
});
