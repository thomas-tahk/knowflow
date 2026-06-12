// src/core/presets/fishbone.test.ts
import { describe, it, expect } from 'vitest';
import { fishbone } from './fishbone';
import type { KnowflowDoc } from '../types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'fishbone', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('fishbone preset', () => {
  it('accepts a valid fishbone', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'Account stays disabled' },
        { id: 'cat1', type: 'category', text: 'Students' },
        { id: 'ca1', type: 'cause', text: 'Not enrolled', categoryId: 'cat1' },
      ],
    });
    expect(fishbone.validate(d)).toEqual([]);
  });

  it('requires exactly one spine', () => {
    const d = doc({ blocks: [{ id: 'cat', type: 'category', text: 'X' }] });
    expect(fishbone.validate(d).some(e => e.code === 'spine-count')).toBe(true);
  });

  it('rejects a cause without a valid category', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'E' },
        { id: 'ca', type: 'cause', text: 'orphan', categoryId: 'ghost' },
      ],
    });
    expect(fishbone.validate(d).some(e => e.code === 'orphan-cause')).toBe(true);
  });

  it('rejects connections (fishbone uses attachment)', () => {
    const d = doc({
      blocks: [{ id: 's', type: 'spine', text: 'E' }],
      connections: [{ id: 'e', from: 's', to: 's' }],
    });
    expect(fishbone.validate(d).some(e => e.code === 'unexpected-connections')).toBe(true);
  });

  it('narrates spine, then each category with its causes', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'E' },
        { id: 'cat1', type: 'category', text: 'Students' },
        { id: 'ca1', type: 'cause', text: 'Not enrolled', categoryId: 'cat1' },
        { id: 'cat2', type: 'category', text: 'Staff' },
      ],
    });
    expect(fishbone.narrationOrder(d).map(b => b.id)).toEqual(['s', 'cat1', 'ca1', 'cat2']);
  });
});
