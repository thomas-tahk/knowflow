import { describe, it, expect } from 'vitest';
import { fishboneSvgLayout } from './fishboneSvgLayout';
import type { KnowflowDoc } from '../core/types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'fishbone', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

const sample = doc({
  blocks: [
    { id: 's', type: 'spine', text: 'Effect' },
    { id: 'c1', type: 'category', text: 'Students' },
    { id: 'c2', type: 'category', text: 'Staff' },
    { id: 'c3', type: 'category', text: 'Contractors' },
    { id: 'x1', type: 'cause', text: 'Not enrolled', categoryId: 'c1' },
    { id: 'x2', type: 'cause', text: 'Graduated', categoryId: 'c1' },
  ],
});

describe('fishboneSvgLayout', () => {
  it('draws a horizontal spine into a head box on the right', () => {
    const g = fishboneSvgLayout(sample);
    expect(g.spine).not.toBeNull();
    expect(g.spine!.y1).toBe(g.spine!.y2); // horizontal
    expect(g.head).not.toBeNull();
    expect(g.head!.cx).toBeGreaterThan(g.spine!.x2); // head to the right of the spine end
  });

  it('attaches ribs to the spine at distinct, increasing joints (not all at one point)', () => {
    const g = fishboneSvgLayout(sample);
    const joints = g.categories.map(c => c.rib.x2);
    const unique = new Set(joints);
    expect(unique.size).toBe(joints.length); // distinct joints — the whole point of a fishbone
    expect(joints[0]).toBeLessThan(joints[1]);
    expect(g.categories.every(c => c.rib.y2 === 0)).toBe(true); // every rib lands on the spine
  });

  it('alternates categories above and below the spine', () => {
    const g = fishboneSvgLayout(sample);
    expect(g.categories[0].box.cy).toBeLessThan(0); // first above
    expect(g.categories[1].box.cy).toBeGreaterThan(0); // second below
  });

  it('places each category its causes as twigs', () => {
    const g = fishboneSvgLayout(sample);
    expect(g.categories[0].causes).toHaveLength(2);
    expect(g.categories[1].causes).toHaveLength(0);
  });

  it('handles a bare spine (no categories) without throwing', () => {
    const g = fishboneSvgLayout(doc({ blocks: [{ id: 's', type: 'spine', text: 'E' }] }));
    expect(g.categories).toHaveLength(0);
    expect(g.head).not.toBeNull();
  });
});
