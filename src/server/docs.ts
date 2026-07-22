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

/** Columns the server owns — a client save may never set these. */
interface ServerOwned {
  status: 'draft' | 'official';
  group: string | null;
  sortOrder: number | null;
  updatedAt: string | null;
}

async function readServerOwned(c: SupabaseClient, id: string): Promise<ServerOwned | null> {
  const { data, error } = await c.from(TABLE).select('status,topic,sort_order,updated_at').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    status: data.status === 'official' ? 'official' : 'draft',
    group: data.topic ?? null,
    sortOrder: data.sort_order ?? null,
    updatedAt: data.updated_at ?? null,
  };
}

export async function saveDoc(doc: KnowflowDoc, base?: string | null): Promise<void> {
  const c = client();

  // Saving can never change status, topic or order: they are read back from the stored row,
  // never taken from the client. Without this, any client could mark its own doc 'official'
  // (and, with the delete guard below, make it undeletable through the app).
  const existing = await readServerOwned(c, doc.id);
  const status = existing?.status ?? 'draft';
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
  // Official flows are curated team content with no version history — removal is deliberate,
  // and happens through the seed script, not through the app.
  const existing = await readServerOwned(c, id);
  if (existing?.status === 'official') throw new OfficialProtected('Official flows cannot be deleted.');
  const { error } = await c.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
