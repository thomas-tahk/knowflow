import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { KnowflowDoc } from '../core/types';

/** Rows the fake Supabase returns from `maybeSingle`, plus a log of what was written. */
const state: {
  existing: Record<string, unknown> | null;
  written: Record<string, unknown>[];
  deleted: string[];
  result: unknown;
} = { existing: null, written: [], deleted: [], result: [] };

function builder() {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  Object.assign(b, {
    select: chain,
    order: chain,
    eq: chain,
    in: chain,
    maybeSingle: async () => ({ data: state.existing, error: null }),
    upsert: (row: Record<string, unknown>) => { state.written.push(row); return b; },
    insert: (row: Record<string, unknown>) => { state.written.push(row); return b; },
    update: (row: Record<string, unknown>) => { state.written.push(row); return b; },
    delete: () => { state.deleted.push('*'); return b; },
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: state.result, error: null }).then(resolve),
  });
  return b;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => builder() }),
}));

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';

const { saveDoc, deleteDoc, OfficialProtected } = await import('./docs');

function doc(overrides: Partial<KnowflowDoc> = {}): KnowflowDoc {
  return {
    id: 'd1', title: 'Doc', preset: 'flowchart', blocks: [], connections: [],
    meta: { author: 'x', createdAt: 't', updatedAt: 't', status: 'draft', version: 1 },
    ...overrides,
  } as KnowflowDoc;
}

beforeEach(() => { state.existing = null; state.written = []; state.deleted = []; state.result = []; });

describe('saveDoc — status is server-owned', () => {
  it('refuses to promote a draft row just because the client says official', async () => {
    state.existing = { status: 'draft', topic: null, sort_order: null, updated_at: 't' };
    await saveDoc(doc({ meta: { ...doc().meta, status: 'official' } }), null);
    expect(state.written[0].status).toBe('draft');
  });

  it('normalises the embedded blob so it cannot disagree with the column', async () => {
    state.existing = { status: 'draft', topic: null, sort_order: null, updated_at: 't' };
    await saveDoc(doc({ meta: { ...doc().meta, status: 'official' } }), null);
    const data = state.written[0].data as KnowflowDoc;
    expect(data.meta.status).toBe('draft');
  });

  it('defaults a brand-new document to draft, never official', async () => {
    state.existing = null;
    await saveDoc(doc({ meta: { ...doc().meta, status: 'official' } }), null);
    expect(state.written[0].status).toBe('draft');
  });

  it('keeps an official row official when the client sends draft', async () => {
    state.existing = { status: 'official', topic: 'Account & Access', sort_order: 2, updated_at: 't' };
    await saveDoc(doc(), null);
    expect(state.written[0].status).toBe('official');
  });

  it('preserves topic and order, which the client never sends', async () => {
    state.existing = { status: 'official', topic: 'Account & Access', sort_order: 2, updated_at: 't' };
    await saveDoc(doc(), null);
    expect(state.written[0].topic).toBe('Account & Access');
    expect(state.written[0].sort_order).toBe(2);
  });
});

describe('deleteDoc — official rows are protected', () => {
  it('refuses to delete an official row', async () => {
    state.existing = { status: 'official', topic: 'g', sort_order: 0, updated_at: 't' };
    await expect(deleteDoc('d1')).rejects.toBeInstanceOf(OfficialProtected);
    expect(state.deleted).toHaveLength(0);
  });

  it('still deletes a draft row', async () => {
    state.existing = { status: 'draft', topic: null, sort_order: null, updated_at: 't' };
    await deleteDoc('d1');
    expect(state.deleted).toHaveLength(1);
  });

  it('still deletes a row that does not exist (no-op, not an error)', async () => {
    state.existing = null;
    await deleteDoc('gone');
    expect(state.deleted).toHaveLength(1);
  });
});
