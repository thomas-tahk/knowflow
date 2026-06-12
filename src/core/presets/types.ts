// src/core/presets/types.ts
import type { KnowflowDoc, Block, BlockType, Preset, ValidationError } from '../types';

export interface PresetDef {
  id: Preset;
  name: string;
  /** Block types a user may add in this preset. */
  blockTypes: BlockType[];
  /** Default block type used when adding without specifying one. */
  defaultBlockType: BlockType;
  /** Returns validation errors; empty array means valid. */
  validate(doc: KnowflowDoc): ValidationError[];
  /** Blocks in the order they should be narrated for the accessible view. */
  narrationOrder(doc: KnowflowDoc): Block[];
}
