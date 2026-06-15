import type { BlockType } from '../core/types';

/** Friendly label + one-line explanation for each block type, shown in the Add panel. */
export const BLOCK_META: Record<BlockType, { label: string; desc: string }> = {
  step: { label: 'Step', desc: 'An action to take' },
  decision: { label: 'Decision', desc: 'A yes/no branch point' },
  outcome: { label: 'Outcome', desc: 'A result or end state' },
  question: { label: 'Question', desc: 'A branching question' },
  spine: { label: 'Effect', desc: 'The problem being analysed' },
  category: { label: 'Category', desc: 'A group of related causes' },
  cause: { label: 'Cause', desc: 'A specific contributing cause' },
  note: { label: 'Note', desc: 'A tip or aside' },
  warning: { label: 'Warning', desc: 'A caution to flag' },
};
