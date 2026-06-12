// src/core/presets/fishbone.ts
import type { KnowflowDoc, Block, BlockType, ValidationError } from '../types';
import type { PresetDef } from './types';

const ALLOWED: BlockType[] = ['spine', 'category', 'cause'];

function validate(doc: KnowflowDoc): ValidationError[] {
  const errors: ValidationError[] = [];
  const categoryIds = new Set(doc.blocks.filter(b => b.type === 'category').map(b => b.id));

  for (const b of doc.blocks) {
    if (!ALLOWED.includes(b.type)) {
      errors.push({ code: 'illegal-block-type', blockId: b.id, message: `"${b.type}" is not allowed in a fishbone.` });
    }
  }
  const spineCount = doc.blocks.filter(b => b.type === 'spine').length;
  if (spineCount !== 1) {
    errors.push({ code: 'spine-count', message: `A fishbone needs exactly one effect (spine); found ${spineCount}.` });
  }
  for (const b of doc.blocks) {
    if (b.type === 'cause' && (!b.categoryId || !categoryIds.has(b.categoryId))) {
      errors.push({ code: 'orphan-cause', blockId: b.id, message: `Cause "${b.text}" is not attached to a category.` });
    }
  }
  if (doc.connections.length > 0) {
    errors.push({ code: 'unexpected-connections', message: 'Fishbone diagrams use category attachment, not connections.' });
  }
  return errors;
}

function narrationOrder(doc: KnowflowDoc): Block[] {
  const ordered: Block[] = [];
  const spine = doc.blocks.find(b => b.type === 'spine');
  if (spine) ordered.push(spine);
  for (const cat of doc.blocks.filter(b => b.type === 'category')) {
    ordered.push(cat);
    ordered.push(...doc.blocks.filter(b => b.type === 'cause' && b.categoryId === cat.id));
  }
  return ordered;
}

export const fishbone: PresetDef = {
  id: 'fishbone',
  name: 'Fishbone',
  blockTypes: ALLOWED,
  defaultBlockType: 'category',
  validate,
  narrationOrder,
};
