import { describe, it, expect } from 'vitest';
import { graphLayout } from './graphLayout';
import type { KnowflowDoc } from '../core/types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'flowchart', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('graphLayout', () => {
  it('returns a position for every block', () => {
    const d = doc({
      blocks: [
        { id: 'a', type: 'step', text: 'Start' },
        { id: 'b', type: 'decision', text: 'OK?' },
        { id: 'c', type: 'outcome', text: 'Done' },
      ],
      connections: [
        { id: 'e1', from: 'a', to: 'b' },
        { id: 'e2', from: 'b', to: 'c', label: 'yes' },
      ],
    });
    const pos = graphLayout(d);
    expect(Object.keys(pos).sort()).toEqual(['a', 'b', 'c']);
    for (const id of ['a', 'b', 'c']) {
      expect(typeof pos[id].x).toBe('number');
      expect(typeof pos[id].y).toBe('number');
    }
  });

  it('places connected nodes top-to-bottom (child below parent)', () => {
    const d = doc({
      blocks: [
        { id: 'a', type: 'step', text: 'Start' },
        { id: 'b', type: 'outcome', text: 'Done' },
      ],
      connections: [{ id: 'e1', from: 'a', to: 'b' }],
    });
    const pos = graphLayout(d);
    expect(pos['b'].y).toBeGreaterThan(pos['a'].y);
  });

  it('handles an empty document without throwing', () => {
    expect(graphLayout(doc({}))).toEqual({});
  });
});
