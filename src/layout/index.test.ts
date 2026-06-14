import { describe, it, expect } from 'vitest';
import { layoutDoc } from './index';
import { createDoc } from '../core/createDoc';
import { addBlock } from '../core/operations';
import type { Clock } from '../core/ids';

const clock: Clock = { newId: (() => { let n = 0; return () => `id${++n}`; })(), nowIso: () => 'x' };

describe('layoutDoc', () => {
  it('returns positions for each preset without throwing', () => {
    for (const preset of ['flowchart', 'decisionTree', 'stepList', 'fishbone'] as const) {
      let d = createDoc(preset, 'T', clock);
      d = addBlock(d, 'A', undefined, clock).doc;
      const pos = layoutDoc(d);
      for (const b of d.blocks) {
        expect(pos[b.id]).toBeDefined();
      }
    }
  });
});
