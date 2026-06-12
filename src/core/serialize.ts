// src/core/serialize.ts
import type { KnowflowDoc, ValidationError } from './types';
import { ALL_PRESETS } from './types';
import { getPreset } from './presets';

export function exportJson(doc: KnowflowDoc): string {
  return JSON.stringify(doc, null, 2);
}

export type ImportResult =
  | { ok: true; doc: KnowflowDoc }
  | { ok: false; errors: ValidationError[] };

export function importJson(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: [{ code: 'invalid-json', message: 'The file is not valid JSON.' }] };
  }

  const shapeErrors = checkShape(parsed);
  if (shapeErrors.length) return { ok: false, errors: shapeErrors };

  const doc = parsed as KnowflowDoc;
  const presetErrors = getPreset(doc.preset).validate(doc);
  if (presetErrors.length) return { ok: false, errors: presetErrors };

  return { ok: true, doc };
}

function checkShape(value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof value !== 'object' || value === null) {
    return [{ code: 'invalid-shape', message: 'Expected a document object.' }];
  }
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string') errors.push({ code: 'invalid-shape', message: 'Missing "id".' });
  if (typeof v.title !== 'string') errors.push({ code: 'invalid-shape', message: 'Missing "title".' });
  if (!ALL_PRESETS.includes(v.preset as never)) errors.push({ code: 'unknown-preset', message: `Unknown preset "${String(v.preset)}".` });
  if (!Array.isArray(v.blocks)) errors.push({ code: 'invalid-shape', message: '"blocks" must be an array.' });
  if (!Array.isArray(v.connections)) errors.push({ code: 'invalid-shape', message: '"connections" must be an array.' });
  if (typeof v.meta !== 'object' || v.meta === null) errors.push({ code: 'invalid-shape', message: 'Missing "meta".' });
  return errors;
}
