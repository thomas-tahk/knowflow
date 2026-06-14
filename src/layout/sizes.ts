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
