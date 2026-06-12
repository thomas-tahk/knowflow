// src/core/serialize.test.ts
import { describe, it, expect } from 'vitest';
import { exportJson, importJson } from './serialize';
import { createDoc } from './createDoc';
import { addBlock } from './operations';
import type { Clock } from './ids';

const clock: Clock = { newId: (() => { let n = 0; return () => `id${++n}`; })(), nowIso: () => '2026-06-12T00:00:00.000Z' };

describe('serialize', () => {
  it('round-trips a document', () => {
    let d = createDoc('flowchart', 'Round trip', clock);
    d = addBlock(d, 'Start', 'step', clock).doc;
    const json = exportJson(d);
    const result = importJson(json);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc).toEqual(d);
  });

  it('rejects non-JSON input', () => {
    const result = importJson('not json {');
    expect(result.ok).toBe(false);
  });

  it('rejects a document with an unknown preset', () => {
    const result = importJson(JSON.stringify({ id: 'x', title: 'T', preset: 'mindmap', blocks: [], connections: [], meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 } }));
    expect(result.ok).toBe(false);
  });

  it('rejects a document that fails preset validation', () => {
    // fishbone with no spine
    const result = importJson(JSON.stringify({ id: 'x', title: 'T', preset: 'fishbone', blocks: [], connections: [], meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some(e => e.code === 'spine-count')).toBe(true);
  });

  it('rejects a document with a non-object element in "connections" without throwing', () => {
    const result = importJson(JSON.stringify({ id: 'x', title: 'T', preset: 'flowchart', blocks: [], connections: [null], meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 } }));
    expect(result.ok).toBe(false);
  });

  it('rejects a document with a non-object element in "blocks" without throwing', () => {
    const result = importJson(JSON.stringify({ id: 'x', title: 'T', preset: 'flowchart', blocks: [null], connections: [], meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 } }));
    expect(result.ok).toBe(false);
  });
});
