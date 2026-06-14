import { describe, it, expect } from 'vitest';
import { getEdgeParams } from './edgeParams';

// Minimal InternalNode stand-in (only the fields getEdgeParams reads).
function fakeNode(x: number, y: number, width = 100, height = 50) {
  return { measured: { width, height }, internals: { positionAbsolute: { x, y } } } as never;
}

describe('getEdgeParams', () => {
  it('returns finite endpoints between two nodes', () => {
    const { sx, sy, tx, ty } = getEdgeParams(fakeNode(0, 0), fakeNode(300, 200));
    for (const v of [sx, sy, tx, ty]) expect(Number.isFinite(v)).toBe(true);
  });

  it('source endpoint exits toward the target', () => {
    // a at origin (center 50,25), b directly to the right
    const { sx } = getEdgeParams(fakeNode(0, 0, 100, 50), fakeNode(400, 0, 100, 50));
    expect(sx).toBeGreaterThan(50);
  });
});
