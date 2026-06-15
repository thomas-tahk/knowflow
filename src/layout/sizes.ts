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

const CHAR = 7.1;      // approx px per character at the node font size
const MAX_W = 240;     // text wraps rather than growing past this
const LINE_H = 19;

/** Estimate a node size from its text so labels fit without overflowing (capped at MAX_W). */
export function estimateSize(text: string, shape: Shape): Size {
  const len = Math.max(text.trim().length, 3);
  if (shape === 'diamond') {
    const side = Math.min(200, Math.max(112, 60 + len * 4.4)); // diamonds stay square
    return { width: side, height: side };
  }
  const padX = shape === 'pill' ? 40 : 32;
  const padY = shape === 'pill' ? 22 : 26;
  const width = Math.min(MAX_W, Math.max(120, len * CHAR + padX));
  const lines = Math.max(1, Math.ceil((len * CHAR) / (width - padX)));
  const minH = shape === 'pill' ? 46 : 52;
  const height = Math.min(190, Math.max(minH, lines * LINE_H + padY));
  return { width, height };
}

/** The size a block should render at: manual override if present, else estimated from its text. */
export function effectiveSize(block: Block): Size {
  if (block.size) return { width: block.size.w, height: block.size.h };
  return estimateSize(block.text, styleFor(block.type).shape);
}
