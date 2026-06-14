import { describe, it, expect } from 'vitest';
import { sizeForShape, type Shape } from './sizes';

describe('node sizes', () => {
  it('returns positive width/height for every shape', () => {
    const shapes: Shape[] = ['rect', 'diamond', 'pill'];
    for (const s of shapes) {
      const { width, height } = sizeForShape(s);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    }
  });

  it('makes diamonds square (equal width and height)', () => {
    const d = sizeForShape('diamond');
    expect(d.width).toBe(d.height);
  });
});
