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
    .from(TABLE).select('id,title,preset,status,updated_at').order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({ id: r.id, title: r.title, preset: r.preset, status: r.status, updatedAt: r.updated_at }));
}

export async function getDoc(id: string): Promise<KnowflowDoc | null> {
  const { data, error } = await client().from(TABLE).select('data').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.data as KnowflowDoc | undefined) ?? null;
}

export async function saveDoc(doc: KnowflowDoc, base?: string | null): Promise<void> {
  const row = {
    id: doc.id, title: doc.title, preset: doc.preset, status: doc.meta.status,
    description: doc.description ?? null, data: doc, updated_at: doc.meta.updatedAt,
  };
  const c = client();

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
  const { data: existing, error: e2 } = await c.from(TABLE).select('updated_at').eq('id', doc.id).maybeSingle();
  if (e2) throw new Error(e2.message);
  if (!existing) {
    const { error: e3 } = await c.from(TABLE).insert(row);
    if (e3) throw new Error(e3.message);
    return;
  }
  throw new ConflictError(existing.updated_at ?? null);
}

export async function deleteDoc(id: string): Promise<void> {
  const { error } = await client().from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
