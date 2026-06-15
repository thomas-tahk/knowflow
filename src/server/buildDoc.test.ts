import { describe, it, expect } from 'vitest';
import { buildDoc } from './buildDoc';
import type { Clock } from '../core/ids';
import { getPreset } from '../core/presets';

function counterClock(): Clock {
  let n = 0;
  return { newId: () => `id${++n}`, nowIso: () => '2026' };
}

describe('buildDoc', () => {
  it('remaps model keys to fresh ids and resolves connections', () => {
    const doc = buildDoc(
      { blocks: [{ key: 'a', type: 'step', text: 'Start' }, { key: 'b', type: 'outcome', text: 'End' }],
        connections: [{ from: 'a', to: 'b', label: 'go' }] },
      'flowchart', 'Flow', counterClock(),
    );
    expect(doc.blocks.map(b => b.text)).toEqual(['Start', 'End']);
    expect(doc.connections).toHaveLength(1);
    const [c] = doc.connections;
    expect(c.from).toBe(doc.blocks[0].id);
    expect(c.to).toBe(doc.blocks[1].id);
    expect(getPreset('flowchart').validate(doc)).toEqual([]);
  });

  it('drops connections that reference unknown keys', () => {
    const doc = buildDoc(
      { blocks: [{ key: 'a', type: 'step', text: 'A' }], connections: [{ from: 'a', to: 'ghost' }] },
      'flowchart', 'F', counterClock(),
    );
    expect(doc.connections).toHaveLength(0);
  });

  it('links fishbone causes to their category and is valid', () => {
    const doc = buildDoc(
      { blocks: [
        { key: 's', type: 'spine', text: 'Account disabled' },
        { key: 'c1', type: 'category', text: 'Students' },
        { key: 'x1', type: 'cause', text: 'Not enrolled', category: 'c1' },
      ] },
      'fishbone', 'Fish', counterClock(),
    );
    const cause = doc.blocks.find(b => b.type === 'cause')!;
    const cat = doc.blocks.find(b => b.type === 'category')!;
    expect(cause.categoryId).toBe(cat.id);
    expect(getPreset('fishbone').validate(doc)).toEqual([]);
  });

  it('adds a spine if a fishbone draft omits one', () => {
    const doc = buildDoc(
      { blocks: [{ key: 'c1', type: 'category', text: 'Students' }] },
      'fishbone', 'My Effect', counterClock(),
    );
    const spines = doc.blocks.filter(b => b.type === 'spine');
    expect(spines).toHaveLength(1);
    expect(spines[0].text).toBe('My Effect');
  });
});
