import { describe, it, expect } from 'vitest';
import { createDoc } from './createDoc';
import type { Clock } from './ids';

const fixedClock: Clock = {
  newId: (() => { let n = 0; return () => `id${++n}`; })(),
  nowIso: () => '2026-06-12T00:00:00.000Z',
};

describe('createDoc', () => {
  it('creates an empty draft for a preset', () => {
    const doc = createDoc('flowchart', 'Untitled', fixedClock);
    expect(doc.preset).toBe('flowchart');
    expect(doc.title).toBe('Untitled');
    expect(doc.blocks).toEqual([]);
    expect(doc.connections).toEqual([]);
    expect(doc.meta.status).toBe('draft');
    expect(doc.meta.version).toBe(1);
    expect(doc.meta.createdAt).toBe('2026-06-12T00:00:00.000Z');
    expect(doc.meta.updatedAt).toBe(doc.meta.createdAt);
    expect(doc.id).toBeTruthy();
  });

  it('seeds a fishbone with a single spine block', () => {
    const doc = createDoc('fishbone', 'Causes', fixedClock);
    const spines = doc.blocks.filter(b => b.type === 'spine');
    expect(spines).toHaveLength(1);
    expect(spines[0].text).toBe('Causes');
  });
});
