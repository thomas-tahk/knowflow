// src/core/presets/decisionTree.test.ts
import { describe, it, expect } from 'vitest';
import { decisionTree } from './decisionTree';
import type { KnowflowDoc } from '../types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'decisionTree', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('decisionTree preset', () => {
  it('accepts a labelled tree', () => {
    const d = doc({
      blocks: [
        { id: 'q', type: 'question', text: 'Student?' },
        { id: 'o1', type: 'outcome', text: 'Re-enable' },
        { id: 'o2', type: 'outcome', text: 'Escalate' },
      ],
      connections: [
        { id: 'e1', from: 'q', to: 'o1', label: 'yes' },
        { id: 'e2', from: 'q', to: 'o2', label: 'no' },
      ],
    });
    expect(decisionTree.validate(d)).toEqual([]);
  });

  it('rejects an unlabelled branch from a question', () => {
    const d = doc({
      blocks: [
        { id: 'q', type: 'question', text: 'Student?' },
        { id: 'o1', type: 'outcome', text: 'Re-enable' },
      ],
      connections: [{ id: 'e1', from: 'q', to: 'o1' }],
    });
    expect(decisionTree.validate(d).some(e => e.code === 'unlabelled-branch')).toBe(true);
  });

  it('rejects a block with two parents (not a tree)', () => {
    const d = doc({
      blocks: [
        { id: 'q1', type: 'question', text: 'A?' },
        { id: 'q2', type: 'question', text: 'B?' },
        { id: 'o', type: 'outcome', text: 'X' },
      ],
      connections: [
        { id: 'e1', from: 'q1', to: 'o', label: 'yes' },
        { id: 'e2', from: 'q2', to: 'o', label: 'yes' },
      ],
    });
    expect(decisionTree.validate(d).some(e => e.code === 'not-a-tree')).toBe(true);
  });
});
