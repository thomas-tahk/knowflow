import { describe, it, expect } from 'vitest';
import { setConnectionLabel, clearDoc } from './operations';
import { estimateSize } from '../layout/sizes';
import type { KnowflowDoc } from './types';
import type { Clock } from './ids';

const clock: Clock = { newId: () => 'x', nowIso: () => '2026' };

function flow(): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'flowchart',
    blocks: [{ id: 'a', type: 'step', text: 'A' }, { id: 'b', type: 'outcome', text: 'B' }],
    connections: [{ id: 'e', from: 'a', to: 'b' }],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
  };
}

describe('setConnectionLabel', () => {
  it('sets the label on the target connection', () => {
    const d = setConnectionLabel(flow(), 'e', 'Yes', clock);
    expect(d.connections[0].label).toBe('Yes');
  });
});

describe('clearDoc', () => {
  it('removes all blocks and connections for a graph preset', () => {
    const d = clearDoc(flow(), clock);
    expect(d.blocks).toHaveLength(0);
    expect(d.connections).toHaveLength(0);
  });

  it('keeps the single spine for a fishbone', () => {
    const fish: KnowflowDoc = {
      id: 'f', title: 'F', preset: 'fishbone',
      blocks: [{ id: 's', type: 'spine', text: 'E' }, { id: 'c', type: 'category', text: 'X' }],
      connections: [], meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    };
    const d = clearDoc(fish, clock);
    expect(d.blocks).toEqual([{ id: 's', type: 'spine', text: 'E' }]);
  });
});

describe('estimateSize', () => {
  it('grows width with longer text but caps it', () => {
    const short = estimateSize('Hi', 'rect');
    const long = estimateSize('A very long label that should wrap onto multiple lines indeed', 'rect');
    expect(long.width).toBeGreaterThanOrEqual(short.width);
    expect(long.width).toBeLessThanOrEqual(240);
    expect(long.height).toBeGreaterThan(short.height); // wraps taller
  });

  it('keeps diamonds square', () => {
    const d = estimateSize('Locked?', 'diamond');
    expect(d.width).toBe(d.height);
  });
});
