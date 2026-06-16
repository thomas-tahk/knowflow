import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { KnowflowDoc } from '../core/types';
import type { DocSummary } from '../core/persistence';

/** Thrown when Supabase env vars are absent (e.g. local dev before setup). The API layer
 *  maps this to HTTP 501 so the client can fall back to localStorage. */
export class StorageNotConfigured extends Error {
  constructor(message?: string) { super(message); this.name = 'StorageNotConfigured'; }
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

export async function saveDoc(doc: KnowflowDoc): Promise<void> {
  const row = {
    id: doc.id, title: doc.title, preset: doc.preset, status: doc.meta.status,
    description: doc.description ?? null, data: doc, updated_at: doc.meta.updatedAt,
  };
  const { error } = await client().from(TABLE).upsert(row);
  if (error) throw new Error(error.message);
}

export async function deleteDoc(id: string): Promise<void> {
  const { error } = await client().from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
