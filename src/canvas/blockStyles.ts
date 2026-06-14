import type { BlockType } from '../core/types';
import type { Shape } from '../layout/sizes';

export interface BlockStyle {
  shape: Shape;
  bg: string;
  border: string;
  ink: string;
}

const STEP: BlockStyle     = { shape: 'rect',    bg: '#E7EDF5', border: '#9DB4D0', ink: '#2E435C' };
const DECISION: BlockStyle = { shape: 'diamond', bg: '#F8EFD6', border: '#D9B968', ink: '#6A4E14' };
const OUTCOME: BlockStyle  = { shape: 'pill',    bg: '#E5F0E7', border: '#92BC9B', ink: '#2F5236' };
const SPINE: BlockStyle    = { shape: 'rect',    bg: '#E4EFEC', border: '#0F766E', ink: '#0B5D56' };
const CATEGORY: BlockStyle = { shape: 'rect',    bg: '#F8EFD6', border: '#D9B968', ink: '#6A4E14' };
const CAUSE: BlockStyle    = { shape: 'rect',    bg: '#FBF8F2', border: '#DED3C2', ink: '#5C564B' };
const NOTE: BlockStyle     = { shape: 'rect',    bg: '#EEF2F6', border: '#C3BAAC', ink: '#5C564B' };
const WARNING: BlockStyle  = { shape: 'rect',    bg: '#F6E7E2', border: '#D9A18F', ink: '#8A4632' };

const TABLE: Record<BlockType, BlockStyle> = {
  step: STEP,
  decision: DECISION,
  outcome: OUTCOME,
  question: DECISION,
  spine: SPINE,
  category: CATEGORY,
  cause: CAUSE,
  note: NOTE,
  warning: WARNING,
};

export function styleFor(type: BlockType): BlockStyle {
  return TABLE[type];
}
