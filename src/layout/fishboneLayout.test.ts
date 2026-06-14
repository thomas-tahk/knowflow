import { describe, it, expect } from 'vitest';
import { fishboneLayout } from './fishboneLayout';
import type { KnowflowDoc } from '../core/types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'fishbone', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('fishboneLayout', () => {
  it('positions spine, categories, and causes', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'Effect' },
        { id: 'c1', type: 'category', text: 'Students' },
        { id: 'ca1', type: 'cause', text: 'Not enrolled', categoryId: 'c1' },
        { id: 'c2', type: 'category', text: 'Staff' },
      ],
    });
    const pos = fishboneLayout(d);
    expect(Object.keys(pos).sort()).toEqual(['c1', 'c2', 'ca1', 's']);
  });

  it('places the spine to the right of the first category', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'Effect' },
        { id: 'c1', type: 'category', text: 'Students' },
      ],
    });
    const pos = fishboneLayout(d);
    expect(pos['s'].x).toBeGreaterThan(pos['c1'].x);
  });

  it('alternates categories above and below the spine', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'E' },
        { id: 'c1', type: 'category', text: 'A' },
        { id: 'c2', type: 'category', text: 'B' },
      ],
    });
    const pos = fishboneLayout(d);
    // first category above (smaller y), second below (larger y)
    expect(pos['c1'].y).toBeLessThan(pos['c2'].y);
  });
});
