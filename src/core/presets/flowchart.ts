// src/core/presets/flowchart.ts
import type { KnowflowDoc, Block, BlockType, ValidationError } from '../types';
import type { PresetDef } from './types';

const ALLOWED: BlockType[] = ['step', 'decision', 'outcome'];

function validate(doc: KnowflowDoc): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set(doc.blocks.map(b => b.id));

  for (const b of doc.blocks) {
    if (!ALLOWED.includes(b.type)) {
      errors.push({ code: 'illegal-block-type', blockId: b.id, message: `"${b.type}" is not allowed in a flowchart.` });
    }
  }
  for (const c of doc.connections) {
    if (!ids.has(c.from) || !ids.has(c.to)) {
      errors.push({ code: 'dangling-connection', message: `Connection ${c.id} points to a missing block.` });
    }
  }
  const hasOutgoing = new Set(doc.connections.map(c => c.from));
  for (const b of doc.blocks) {
    if (b.type === 'decision' && !hasOutgoing.has(b.id)) {
      errors.push({ code: 'decision-no-branches', blockId: b.id, message: `Decision "${b.text}" has no branches.` });
    }
  }
  return errors;
}

/** Breadth-first from roots (no incoming edge); unreached blocks appended in document order. */
export function bfsOrder(doc: KnowflowDoc): Block[] {
  const byId = new Map(doc.blocks.map(b => [b.id, b]));
  const incoming = new Set(doc.connections.map(c => c.to));
  const out = new Map<string, string[]>();
  for (const c of doc.connections) {
    if (!out.has(c.from)) out.set(c.from, []);
    out.get(c.from)!.push(c.to);
  }
  const roots = doc.blocks.filter(b => !incoming.has(b.id));
  const queue = (roots.length ? roots : doc.blocks).map(b => b.id);
  const seen = new Set<string>();
  const ordered: Block[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const b = byId.get(id);
    if (b) ordered.push(b);
    for (const next of out.get(id) ?? []) if (!seen.has(next)) queue.push(next);
  }
  // Append blocks unreached by BFS (disconnected islands, e.g. cycles with no root) in document order.
  for (const b of doc.blocks) if (!seen.has(b.id)) ordered.push(b);
  return ordered;
}

export const flowchart: PresetDef = {
  id: 'flowchart',
  name: 'Flowchart',
  blockTypes: ALLOWED,
  defaultBlockType: 'step',
  validate,
  narrationOrder: bfsOrder,
};
