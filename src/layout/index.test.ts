import { describe, it, expect } from 'vitest';
import { layoutDoc } from './index';
import { createDoc } from '../core/createDoc';
import { addBlock } from '../core/operations';
import type { Clock } from '../core/ids';

const clock: Clock = { newId: (() => { let n = 0; return () => `id${++n}`; })(), nowIso: () => 'x' };

describe('layoutDoc', () => {
  // Fishbone has its own SVG layout (fishboneSvgLayout); the React Flow path covers the other three.
  it('returns React Flow positions for each graph/list preset without throwing', () => {
    for (const preset of ['flowchart', 'decisionTree', 'stepList'] as const) {
      let d = createDoc(preset, 'T', clock);
      d = addBlock(d, 'A', undefined, clock).doc;
      const pos = layoutDoc(d);
      for (const b of d.blocks) {
        expect(pos[b.id]).toBeDefined();
      }
    }
  });

  it('returns no positions for fishbone (rendered separately)', () => {
    const d = createDoc('fishbone', 'T', clock);
    expect(layoutDoc(d)).toEqual({});
  });
});
