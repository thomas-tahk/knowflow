// src/core/presets/stepList.test.ts
import { describe, it, expect } from 'vitest';
import { stepList } from './stepList';
import type { KnowflowDoc } from '../types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'stepList', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('stepList preset', () => {
  it('accepts a sequence of steps, notes, warnings', () => {
    const d = doc({
      blocks: [
        { id: '1', type: 'step', text: 'Open console' },
        { id: '2', type: 'warning', text: 'Double-check the user' },
        { id: '3', type: 'step', text: 'Reset password' },
      ],
    });
    expect(stepList.validate(d)).toEqual([]);
  });

  it('rejects a foreign block type', () => {
    const d = doc({ blocks: [{ id: '1', type: 'decision', text: 'x' }] });
    expect(stepList.validate(d).some(e => e.code === 'illegal-block-type')).toBe(true);
  });

  it('rejects connections', () => {
    const d = doc({
      blocks: [{ id: '1', type: 'step', text: 'x' }],
      connections: [{ id: 'e', from: '1', to: '1' }],
    });
    expect(stepList.validate(d).some(e => e.code === 'unexpected-connections')).toBe(true);
  });

  it('narrates in document order', () => {
    const d = doc({
      blocks: [
        { id: '1', type: 'step', text: 'A' },
        { id: '2', type: 'step', text: 'B' },
      ],
    });
    expect(stepList.narrationOrder(d).map(b => b.id)).toEqual(['1', '2']);
  });
});
