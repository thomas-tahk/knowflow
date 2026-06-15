export type Shape = 'rect' | 'diamond' | 'pill';

export interface Size { width: number; height: number; }

const SIZES: Record<Shape, Size> = {
  rect: { width: 180, height: 56 },
  diamond: { width: 130, height: 130 },
  pill: { width: 170, height: 52 },
};

export function sizeForShape(shape: Shape): Size {
  return SIZES[shape];
}

import type { Block } from '../core/types';
import { styleFor } from '../canvas/blockStyles';

/** The size a block should render at: manual override if present, else its shape default. */
export function effectiveSize(block: Block): Size {
  if (block.size) return { width: block.size.w, height: block.size.h };
  return sizeForShape(styleFor(block.type).shape);
}
