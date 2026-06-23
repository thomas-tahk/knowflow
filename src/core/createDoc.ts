import type { KnowflowDoc, Preset, Block } from './types';
import { systemClock, type Clock } from './ids.js';

export function createDoc(preset: Preset, title = 'Untitled', clock: Clock = systemClock): KnowflowDoc {
  const now = clock.nowIso();
  const blocks: Block[] = [];

  // Fishbone is invalid without exactly one spine, so seed it.
  if (preset === 'fishbone') {
    blocks.push({ id: clock.newId(), type: 'spine', text: title });
  }

  return {
    id: clock.newId(),
    title,
    preset,
    blocks,
    connections: [],
    meta: { createdAt: now, updatedAt: now, status: 'draft', version: 1 },
  };
}
