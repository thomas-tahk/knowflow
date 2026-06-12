// src/core/presets/index.test.ts
import { describe, it, expect } from 'vitest';
import { getPreset, PRESETS } from './index';
import { ALL_PRESETS } from '../types';

describe('preset registry', () => {
  it('has a def for every preset', () => {
    for (const id of ALL_PRESETS) {
      expect(getPreset(id).id).toBe(id);
    }
  });

  it('exposes presets as an array for UI menus', () => {
    expect(PRESETS.map(p => p.id).sort()).toEqual([...ALL_PRESETS].sort());
  });
});
