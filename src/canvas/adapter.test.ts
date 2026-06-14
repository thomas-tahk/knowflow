import { describe, it, expect } from 'vitest';
import { toReactFlow } from './adapter';
import type { KnowflowDoc } from '../core/types';
import { layoutDoc } from '../layout';

function build(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'flowchart', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('toReactFlow adapter', () => {
  it('maps blocks to nodes with position and data', () => {
    const doc = build({
      blocks: [{ id: 'a', type: 'step', text: 'Start' }],
    });
    const { nodes } = toReactFlow(doc, layoutDoc(doc));
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('a');
    expect(nodes[0].type).toBe('knowflow');
    expect(nodes[0].data).toMatchObject({ blockType: 'step', text: 'Start' });
    expect(nodes[0].position).toBeDefined();
  });

  it('maps flowchart connections to edges with labels and arrowheads', () => {
    const doc = build({
      blocks: [
        { id: 'a', type: 'step', text: 'Start' },
        { id: 'b', type: 'outcome', text: 'Done' },
      ],
      connections: [{ id: 'e1', from: 'a', to: 'b', label: 'yes' }],
    });
    const { edges } = toReactFlow(doc, layoutDoc(doc));
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ id: 'e1', source: 'a', target: 'b', label: 'yes' });
    expect(edges[0].markerEnd).toBeDefined();
  });

  it('synthesizes sequence edges for step lists', () => {
    const doc = build({
      preset: 'stepList',
      blocks: [
        { id: '1', type: 'step', text: 'A' },
        { id: '2', type: 'step', text: 'B' },
        { id: '3', type: 'step', text: 'C' },
      ],
    });
    const { edges } = toReactFlow(doc, layoutDoc(doc));
    expect(edges).toHaveLength(2);
    expect(edges.map(e => [e.source, e.target])).toEqual([['1', '2'], ['2', '3']]);
  });

  it('synthesizes rib edges for fishbone (cause->category, category->spine)', () => {
    const doc = build({
      preset: 'fishbone',
      blocks: [
        { id: 's', type: 'spine', text: 'E' },
        { id: 'c1', type: 'category', text: 'Students' },
        { id: 'ca1', type: 'cause', text: 'x', categoryId: 'c1' },
      ],
    });
    const { edges } = toReactFlow(doc, layoutDoc(doc));
    const pairs = edges.map(e => [e.source, e.target]).sort();
    expect(pairs).toEqual([['c1', 's'], ['ca1', 'c1']].sort());
    expect(edges.every(e => e.type === 'floating')).toBe(true);
  });
});
