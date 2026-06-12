import { describe, it, expect } from 'vitest';
import type { KnowflowDoc, Block, Connection } from './types';
import { ALL_BLOCK_TYPES, ALL_PRESETS } from './types';

describe('domain types', () => {
  it('exposes every block type and preset as runtime arrays', () => {
    expect(ALL_PRESETS).toEqual(['flowchart', 'decisionTree', 'fishbone', 'stepList']);
    expect(ALL_BLOCK_TYPES).toContain('step');
    expect(ALL_BLOCK_TYPES).toContain('decision');
    expect(ALL_BLOCK_TYPES).toContain('spine');
  });

  it('a document literal satisfies the types', () => {
    const block: Block = { id: 'b1', type: 'step', text: 'Do a thing' };
    const conn: Connection = { id: 'c1', from: 'b1', to: 'b2' };
    const doc: KnowflowDoc = {
      id: 'd1', title: 'T', preset: 'flowchart',
      blocks: [block], connections: [conn],
      meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    };
    expect(doc.blocks[0].text).toBe('Do a thing');
  });
});
