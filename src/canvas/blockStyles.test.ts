import { describe, it, expect } from 'vitest';
import { styleFor } from './blockStyles';
import { ALL_BLOCK_TYPES } from '../core/types';

describe('block styles', () => {
  it('has a style for every block type', () => {
    for (const t of ALL_BLOCK_TYPES) {
      const s = styleFor(t);
      expect(s.shape).toMatch(/^(rect|diamond|pill)$/);
      expect(s.bg).toMatch(/^#/);
    }
  });

  it('uses diamond for decisions and questions, pill for outcomes', () => {
    expect(styleFor('decision').shape).toBe('diamond');
    expect(styleFor('question').shape).toBe('diamond');
    expect(styleFor('outcome').shape).toBe('pill');
  });
});
