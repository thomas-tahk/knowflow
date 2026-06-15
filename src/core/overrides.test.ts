import { describe, it, expect } from 'vitest';
import { moveBlock, resizeBlock, resetLayout } from './operations';
import { graphLayout } from '../layout/graphLayout';
import type { KnowflowDoc } from './types';
import type { Clock } from './ids';

const clock: Clock = { newId: () => 'x', nowIso: () => '2026' };

function doc(): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'flowchart',
    blocks: [
      { id: 'a', type: 'step', text: 'A' },
      { id: 'b', type: 'outcome', text: 'B' },
    ],
    connections: [{ id: 'e', from: 'a', to: 'b' }],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
  };
}

describe('placement overrides', () => {
  it('moveBlock sets position on only the target block and bumps updatedAt', () => {
    const d = moveBlock(doc(), 'a', { x: 500, y: 40 }, clock);
    expect(d.blocks.find(b => b.id === 'a')!.position).toEqual({ x: 500, y: 40 });
    expect(d.blocks.find(b => b.id === 'b')!.position).toBeUndefined();
    expect(d.meta.updatedAt).toBe('2026');
  });

  it('resizeBlock sets size on the target block', () => {
    const d = resizeBlock(doc(), 'a', { w: 240, h: 90 }, clock);
    expect(d.blocks.find(b => b.id === 'a')!.size).toEqual({ w: 240, h: 90 });
  });

  it('resetLayout strips every position and size', () => {
    let d = moveBlock(doc(), 'a', { x: 500, y: 40 }, clock);
    d = resizeBlock(d, 'b', { w: 240, h: 90 }, clock);
    d = resetLayout(d, clock);
    expect(d.blocks.every(b => b.position === undefined && b.size === undefined)).toBe(true);
  });

  it('graphLayout honors a position override instead of the computed position', () => {
    const d = moveBlock(doc(), 'a', { x: 500, y: 40 }, clock);
    const pos = graphLayout(d);
    expect(pos['a']).toEqual({ x: 500, y: 40 });
  });
});
