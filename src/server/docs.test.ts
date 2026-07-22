import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { KnowflowDoc } from '../core/types';

/** Rows the fake Supabase returns from `maybeSingle`, plus a log of what was written.
 *  `from(table)` routes to a per-table builder: `documents` and `document_versions`. */
const state: {
  existing: Record<string, unknown> | null;
  written: Record<string, unknown>[];
  deleted: string[];
  result: unknown;
  versions: {
    /** Result of any select on document_versions (coalesce check, listVersions). */
    queryResult: Record<string, unknown>[];
    /** Row returned by maybeSingle on document_versions (getVersion). */
    single: Record<string, unknown> | null;
    /** Rows inserted into document_versions. */
    inserted: Record<string, unknown>[];
    /** When set, inserts into document_versions fail with this message. */
    insertError: string | null;
  };
} = {
  existing: null, written: [], deleted: [], result: [],
  versions: { queryResult: [], single: null, inserted: [], insertError: null },
};

function documentsBuilder() {
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

function versionsBuilder() {
  let op: 'select' | 'insert' = 'select';
  const b: Record<string, unknown> = {};
  const chain = () => b;
  Object.assign(b, {
    select: chain,
    order: chain,
    eq: chain,
    limit: chain,
    maybeSingle: async () => ({ data: state.versions.single, error: null }),
    insert: (row: Record<string, unknown>) => {
      op = 'insert';
      if (!state.versions.insertError) state.versions.inserted.push(row);
      return b;
    },
    then: (resolve: (v: unknown) => unknown) => {
      const error = op === 'insert' && state.versions.insertError
        ? { message: state.versions.insertError } : null;
      const data = op === 'insert' ? null : state.versions.queryResult;
      return Promise.resolve({ data, error }).then(resolve);
    },
  });
  return b;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => (table === 'document_versions' ? versionsBuilder() : documentsBuilder()),
  }),
}));

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';

const { saveDoc, deleteDoc, listVersions, getVersion, OfficialProtected } = await import('./docs');

function doc(overrides: Partial<KnowflowDoc> = {}): KnowflowDoc {
  return {
    id: 'd1', title: 'Doc', preset: 'flowchart', blocks: [], connections: [],
    meta: { author: 'x', createdAt: 't', updatedAt: 't', status: 'draft', version: 1 },
    ...overrides,
  } as KnowflowDoc;
}

/** An existing `documents` row whose content differs from what `doc()` is about to save. */
function outgoingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: 'draft', topic: null, sort_order: null, updated_at: 'old-token',
    title: 'Old title', data: { id: 'd1', title: 'Old title' },
    ...overrides,
  };
}

const editedDoc = () => doc({ meta: { ...doc().meta, updatedAt: 'new-token' } });

beforeEach(() => {
  state.existing = null; state.written = []; state.deleted = []; state.result = [];
  state.versions = { queryResult: [], single: null, inserted: [], insertError: null };
});

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

describe('saveDoc — archives the outgoing row into document_versions', () => {
  it('copies the outgoing row (data, title, doc_updated_at) before overwriting', async () => {
    state.existing = outgoingRow();
    await saveDoc(editedDoc(), null);
    expect(state.versions.inserted).toHaveLength(1);
    expect(state.versions.inserted[0]).toMatchObject({
      doc_id: 'd1', title: 'Old title',
      data: { id: 'd1', title: 'Old title' }, doc_updated_at: 'old-token',
    });
    expect(state.written).toHaveLength(1); // the save itself still happened
  });

  it('archives nothing when content is unchanged (same updated_at token)', async () => {
    state.existing = outgoingRow({ updated_at: 't' }); // matches doc().meta.updatedAt
    await saveDoc(doc(), null);
    expect(state.versions.inserted).toHaveLength(0);
    expect(state.written).toHaveLength(1);
  });

  it('skips the archive when the newest version is less than 10 minutes old', async () => {
    state.existing = outgoingRow();
    state.versions.queryResult = [{ archived_at: new Date(Date.now() - 5 * 60_000).toISOString() }];
    await saveDoc(editedDoc(), null);
    expect(state.versions.inserted).toHaveLength(0);
    expect(state.written).toHaveLength(1);
  });

  it('archives when the newest version is more than 10 minutes old', async () => {
    state.existing = outgoingRow();
    state.versions.queryResult = [{ archived_at: new Date(Date.now() - 11 * 60_000).toISOString() }];
    await saveDoc(editedDoc(), null);
    expect(state.versions.inserted).toHaveLength(1);
  });

  it('archives nothing for a brand-new doc', async () => {
    state.existing = null;
    await saveDoc(doc(), null);
    expect(state.versions.inserted).toHaveLength(0);
  });

  it('rejects the save when the archive insert fails; nothing written to documents', async () => {
    state.existing = outgoingRow();
    state.versions.insertError = 'insert failed';
    await expect(saveDoc(editedDoc(), null)).rejects.toThrow('insert failed');
    expect(state.written).toHaveLength(0);
  });
});

describe('saveDoc — forceArchive (the restore path)', () => {
  it('archives even when the newest version is fresh (restore must never destroy current)', async () => {
    state.existing = outgoingRow();
    state.versions.queryResult = [{ archived_at: new Date(Date.now() - 60_000).toISOString() }];
    await saveDoc(editedDoc(), null, { forceArchive: true });
    expect(state.versions.inserted).toHaveLength(1);
    expect(state.versions.inserted[0]).toMatchObject({ doc_id: 'd1', doc_updated_at: 'old-token' });
  });

  it('still archives nothing when content is unchanged (same token)', async () => {
    state.existing = outgoingRow({ updated_at: 't' }); // matches doc().meta.updatedAt
    await saveDoc(doc(), null, { forceArchive: true });
    expect(state.versions.inserted).toHaveLength(0);
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

describe('deleteDoc — archives the draft before deleting', () => {
  it('copies the draft row into document_versions, then deletes', async () => {
    state.existing = outgoingRow();
    await deleteDoc('d1');
    expect(state.versions.inserted).toHaveLength(1);
    expect(state.versions.inserted[0]).toMatchObject({
      doc_id: 'd1', title: 'Old title', doc_updated_at: 'old-token',
    });
    expect(state.deleted).toHaveLength(1);
  });

  it('archives nothing when the official delete is refused', async () => {
    state.existing = outgoingRow({ status: 'official' });
    await expect(deleteDoc('d1')).rejects.toBeInstanceOf(OfficialProtected);
    expect(state.versions.inserted).toHaveLength(0);
  });

  it('archives nothing for a row that does not exist', async () => {
    state.existing = null;
    await deleteDoc('gone');
    expect(state.versions.inserted).toHaveLength(0);
  });
});

describe('version history reads', () => {
  it('listVersions maps rows to summaries, newest first as returned', async () => {
    state.versions.queryResult = [
      { id: 2, doc_id: 'd1', title: 'Newer', archived_at: '2026-07-22T10:00:00Z' },
      { id: 1, doc_id: 'd1', title: 'Older', archived_at: '2026-07-22T09:00:00Z' },
    ];
    const list = await listVersions('d1');
    expect(list).toEqual([
      { id: 2, docId: 'd1', title: 'Newer', archivedAt: '2026-07-22T10:00:00Z' },
      { id: 1, docId: 'd1', title: 'Older', archivedAt: '2026-07-22T09:00:00Z' },
    ]);
  });

  it('getVersion returns the stored doc blob', async () => {
    state.versions.single = { data: { id: 'd1', title: 'Old title' } };
    expect(await getVersion(1)).toEqual({ id: 'd1', title: 'Old title' });
  });

  it('getVersion returns null for an unknown version id', async () => {
    state.versions.single = null;
    expect(await getVersion(999)).toBeNull();
  });
});
