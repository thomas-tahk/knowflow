// src/core/presets/decisionTree.ts
import type { KnowflowDoc, BlockType, ValidationError } from '../types';
import type { PresetDef } from './types';
import { bfsOrder } from './flowchart';

const ALLOWED: BlockType[] = ['question', 'outcome'];

function validate(doc: KnowflowDoc): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set(doc.blocks.map(b => b.id));
  const typeById = new Map(doc.blocks.map(b => [b.id, b.type]));

  for (const b of doc.blocks) {
    if (!ALLOWED.includes(b.type)) {
      errors.push({ code: 'illegal-block-type', blockId: b.id, message: `"${b.type}" is not allowed in a decision tree.` });
    }
  }
  for (const c of doc.connections) {
    if (!ids.has(c.from) || !ids.has(c.to)) {
      errors.push({ code: 'dangling-connection', message: `Connection ${c.id} points to a missing block.` });
    }
    if (typeById.get(c.from) === 'question' && !c.label) {
      errors.push({ code: 'unlabelled-branch', message: `A branch from "${typeById.get(c.from)}" has no answer label.` });
    }
  }
  const parents = new Map<string, number>();
  for (const c of doc.connections) parents.set(c.to, (parents.get(c.to) ?? 0) + 1);
  for (const [id, count] of parents) {
    if (count > 1) errors.push({ code: 'not-a-tree', blockId: id, message: 'A block has more than one parent.' });
  }
  return errors;
}

export const decisionTree: PresetDef = {
  id: 'decisionTree',
  name: 'Decision Tree',
  blockTypes: ALLOWED,
  defaultBlockType: 'question',
  validate,
  narrationOrder: bfsOrder,
};
