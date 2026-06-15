export const ALL_PRESETS = ['flowchart', 'decisionTree', 'fishbone', 'stepList'] as const;
export type Preset = (typeof ALL_PRESETS)[number];

export const ALL_BLOCK_TYPES = [
  'step', 'decision', 'outcome', // flowchart
  'question',                    // decisionTree (+ outcome)
  'spine', 'category', 'cause',  // fishbone
  'note', 'warning',             // stepList (+ step)
] as const;
export type BlockType = (typeof ALL_BLOCK_TYPES)[number];

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  /** Fishbone only: the category a cause attaches to. */
  categoryId?: string;
  /** Manual placement override (top-left, React Flow coords). Absent → auto-layout. */
  position?: { x: number; y: number };
  /** Manual size override. Absent → shape default. */
  size?: { w: number; h: number };
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface DocMeta {
  author?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'official';
  version: number;
}

export interface KnowflowDoc {
  id: string;
  title: string;
  preset: Preset;
  blocks: Block[];
  connections: Connection[];
  meta: DocMeta;
}

export interface ValidationError {
  code: string;
  message: string;
  blockId?: string;
}
