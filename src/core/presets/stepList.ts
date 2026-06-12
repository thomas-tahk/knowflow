// src/core/presets/stepList.ts
import type { KnowflowDoc, BlockType, ValidationError } from '../types';
import type { PresetDef } from './types';

const ALLOWED: BlockType[] = ['step', 'note', 'warning'];

function validate(doc: KnowflowDoc): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const b of doc.blocks) {
    if (!ALLOWED.includes(b.type)) {
      errors.push({ code: 'illegal-block-type', blockId: b.id, message: `"${b.type}" is not allowed in a step list.` });
    }
  }
  if (doc.connections.length > 0) {
    errors.push({ code: 'unexpected-connections', message: 'Step lists are linear; the block order is the sequence.' });
  }
  return errors;
}

export const stepList: PresetDef = {
  id: 'stepList',
  name: 'Step List',
  blockTypes: ALLOWED,
  defaultBlockType: 'step',
  validate,
  narrationOrder: (doc) => [...doc.blocks],
};
