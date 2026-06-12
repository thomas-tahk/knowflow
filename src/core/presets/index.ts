// src/core/presets/index.ts
import type { Preset } from '../types';
import type { PresetDef } from './types';
import { flowchart } from './flowchart';
import { decisionTree } from './decisionTree';
import { fishbone } from './fishbone';
import { stepList } from './stepList';

const REGISTRY: Record<Preset, PresetDef> = {
  flowchart,
  decisionTree,
  fishbone,
  stepList,
};

export const PRESETS: PresetDef[] = Object.values(REGISTRY);

export function getPreset(id: Preset): PresetDef {
  return REGISTRY[id];
}

export type { PresetDef } from './types';
