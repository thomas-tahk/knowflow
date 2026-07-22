import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { KnowflowDoc } from '../core/types';
import type { DocSummary } from '../core/persistence';

/** Thrown when Supabase env vars are absent (e.g. local dev before setup). The API layer
 *  maps this to HTTP 501 so the client can fall back to localStorage. */
export class StorageNotConfigured extends Error {
  constructor(message?: string) { super(message); this.name = 'StorageNotConfigured'; }
}

/** Thrown when the stored copy changed since the client last synced (someone else saved). */
export class ConflictError extends Error {
  currentUpdatedAt: string | null;
  constructor(currentUpdatedAt: string | null) { super('Conflict'); this.name = 'Conflict'; this.currentUpdatedAt = currentUpdatedAt; }
}

/** Thrown when an operation is refused because the target row is an official flow. */
export class OfficialProtected extends Error {
  constructor(message: string) { super(message); this.name = 'OfficialProtected'; }
}

const TABLE = 'documents';
const VERSIONS_TABLE = 'document_versions';
/** One editing burst → one version: skip archiving while the newest version is this fresh. */
const COALESCE_MS = 10 * 60 * 1000;
let cached: SupabaseClient | null = null;

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new StorageNotConfigured('Supabase is not configured.');
  if (!cached) cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export async function listDocs(): Promise<DocSummary[]> {
  const { data, error } = await client()
    .from(TABLE).select('id,title,preset,status,updated_at,topic,sort_order').order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    id: r.id, title: r.title, preset: r.preset, status: r.status, updatedAt: r.updated_at,
    group: r.topic ?? undefined, sortOrder: r.sort_order ?? undefined,
  }));
}

export async function getDoc(id: string): Promise<KnowflowDoc | null> {
  const { data, error } = await client().from(TABLE).select('data').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.data as KnowflowDoc | undefined) ?? null;
}

/** The stored row: server-owned columns (a client save may never set these) plus the
 *  outgoing content (`title`, `data`) that gets archived before an overwrite. */
interface ExistingRow {
  status: 'draft' | 'official';
  group: string | null;
  sortOrder: number | null;
  updatedAt: string | null;
  title: string | null;
  data: unknown;
}

async function readExisting(c: SupabaseClient, id: string): Promise<ExistingRow | null> {
  const { data, error } = await c.from(TABLE).select('status,topic,sort_order,updated_at,title,data').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    status: data.status === 'official' ? 'official' : 'draft',
    group: data.topic ?? null,
    sortOrder: data.sort_order ?? null,
    updatedAt: data.updated_at ?? null,
    title: data.title ?? null,
    data: data.data ?? null,
  };
}

/** Append the outgoing row to `document_versions`. Throws on failure — a save that
 *  cannot archive must not overwrite (a silently absent safety net is not a safety net). */
async function insertVersion(c: SupabaseClient, docId: string, row: ExistingRow): Promise<void> {
  const { error } = await c.from(VERSIONS_TABLE).insert({
    doc_id: docId, title: row.title, data: row.data, doc_updated_at: row.updatedAt,
  });
  if (error) throw new Error(error.message);
}

/** Archive the outgoing row before an overwrite — unless the content is unchanged
 *  (identical conflict token: opening a flow re-saves identical content 600ms later)
 *  or the newest version is under 10 minutes old (coalesces autosave bursts). */
async function archiveOutgoing(c: SupabaseClient, existing: ExistingRow, doc: KnowflowDoc): Promise<void> {
  if (existing.updatedAt === doc.meta.updatedAt) return;
  const { data, error } = await c.from(VERSIONS_TABLE)
    .select('archived_at').eq('doc_id', doc.id).order('archived_at', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  const newest = data?.[0]?.archived_at;
  if (newest && Date.now() - new Date(newest).getTime() < COALESCE_MS) return;
  await insertVersion(c, doc.id, existing);
}

export async function saveDoc(doc: KnowflowDoc, base?: string | null): Promise<void> {
  const c = client();

  // Saving can never change status, topic or order: they are read back from the stored row,
  // never taken from the client. Without this, any client could mark its own doc 'official'
  // (and, with the delete guard below, make it undeletable through the app).
  const existing = await readExisting(c, doc.id);
  const status = existing?.status ?? 'draft';

  // The outgoing row is archived before every overwrite, server-side, so no client bug
  // can skip the safety net. Failure here fails the whole save (throws).
  if (existing) await archiveOutgoing(c, existing, doc);


  const row = {
    id: doc.id, title: doc.title, preset: doc.preset, status,
    topic: existing?.group ?? null,
    sort_order: existing?.sortOrder ?? null,
    description: doc.description ?? null,
    // Normalise the embedded copy too, so the blob can't disagree with the column.
    data: { ...doc, meta: { ...doc.meta, status } },
    updated_at: doc.meta.updatedAt,
  };

  // No base → unconditional write (new doc, or an explicit "overwrite theirs").
  if (!base) {
    const { error } = await c.from(TABLE).upsert(row);
    if (error) throw new Error(error.message);
    return;
  }

  // Conditional update: only succeed if the server copy still matches the version we opened.
  const { data, error } = await c.from(TABLE).update(row).eq('id', doc.id).eq('updated_at', base).select('id');
  if (error) throw new Error(error.message);
  if (data && data.length > 0) return;

  // Nothing updated: either the row doesn't exist yet (insert) or someone else changed it (conflict).
  if (!existing) {
    const { error: e3 } = await c.from(TABLE).insert(row);
    if (e3) throw new Error(e3.message);
    return;
  }
  throw new ConflictError(existing.updatedAt);
}

export async function deleteDoc(id: string): Promise<void> {
  const c = client();
  // Official flows are curated team content — removal is deliberate, and happens
  // through the seed script, not through the app.
  const existing = await readExisting(c, id);
  if (existing?.status === 'official') throw new OfficialProtected('Official flows cannot be deleted.');
  // Archive unconditionally (no coalescing — this is the last copy). No undelete UI in v1;
  // recovery is a manual SQL query against document_versions.
  if (existing) await insertVersion(c, id, existing);
  const { error } = await c.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface VersionSummary {
  id: number;
  docId: string;
  title: string | null;
  archivedAt: string;
}

export async function listVersions(docId: string): Promise<VersionSummary[]> {
  const { data, error } = await client().from(VERSIONS_TABLE)
    .select('id,doc_id,title,archived_at').eq('doc_id', docId).order('archived_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({ id: r.id, docId: r.doc_id, title: r.title, archivedAt: r.archived_at }));
}

export async function getVersion(id: number): Promise<KnowflowDoc | null> {
  const { data, error } = await client().from(VERSIONS_TABLE).select('data').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.data as KnowflowDoc | undefined) ?? null;
}
