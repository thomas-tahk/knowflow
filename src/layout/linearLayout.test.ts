import { describe, it, expect } from 'vitest';
import { linearLayout } from './linearLayout';
import type { KnowflowDoc } from '../core/types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'stepList', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('linearLayout', () => {
  it('stacks blocks top-to-bottom in order, same x', () => {
    const d = doc({
      blocks: [
        { id: '1', type: 'step', text: 'A' },
        { id: '2', type: 'step', text: 'B' },
        { id: '3', type: 'warning', text: 'C' },
      ],
    });
    const pos = linearLayout(d);
    expect(pos['1'].x).toBe(pos['2'].x);
    expect(pos['2'].y).toBeGreaterThan(pos['1'].y);
    expect(pos['3'].y).toBeGreaterThan(pos['2'].y);
  });
});
