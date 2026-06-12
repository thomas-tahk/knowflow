// src/core/presets/flowchart.test.ts
import { describe, it, expect } from 'vitest';
import { flowchart } from './flowchart';
import type { KnowflowDoc } from '../types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'flowchart', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('flowchart preset', () => {
  it('accepts a valid flowchart', () => {
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
    expect(flowchart.validate(d)).toEqual([]);
  });

  it('rejects a block of a foreign type', () => {
    const d = doc({ blocks: [{ id: 'a', type: 'spine', text: 'x' }] });
    const errs = flowchart.validate(d);
    expect(errs.some(e => e.code === 'illegal-block-type')).toBe(true);
  });

  it('rejects a connection to a missing block', () => {
    const d = doc({
      blocks: [{ id: 'a', type: 'step', text: 'x' }],
      connections: [{ id: 'e', from: 'a', to: 'ghost' }],
    });
    expect(flowchart.validate(d).some(e => e.code === 'dangling-connection')).toBe(true);
  });

  it('flags a decision with no outgoing branch', () => {
    const d = doc({ blocks: [{ id: 'a', type: 'decision', text: 'OK?' }] });
    expect(flowchart.validate(d).some(e => e.code === 'decision-no-branches')).toBe(true);
  });

  it('narrates breadth-first from the start block', () => {
    const d = doc({
      blocks: [
        { id: 'c', type: 'outcome', text: 'Done' },
        { id: 'a', type: 'step', text: 'Start' },
        { id: 'b', type: 'decision', text: 'OK?' },
      ],
      connections: [
        { id: 'e1', from: 'a', to: 'b' },
        { id: 'e2', from: 'b', to: 'c', label: 'yes' },
      ],
    });
    expect(flowchart.narrationOrder(d).map(b => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('includes every block exactly once when a disconnected cycle island is present', () => {
    const d = doc({
      blocks: [
        { id: 'R', type: 'step', text: 'Root' },
        { id: 'S', type: 'outcome', text: 'End' },
        { id: 'A', type: 'step', text: 'Island A' },
        { id: 'B', type: 'step', text: 'Island B' },
      ],
      connections: [
        { id: 'e1', from: 'R', to: 'S' },
        { id: 'e2', from: 'A', to: 'B' },
        { id: 'e3', from: 'B', to: 'A' },
      ],
    });
    const ids = flowchart.narrationOrder(d).map(b => b.id);
    expect(ids.length).toBe(d.blocks.length);
    expect([...ids].sort()).toEqual(d.blocks.map(b => b.id).sort());
  });
});
