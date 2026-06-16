import type { KnowflowDoc } from '../core/types';
import { DocumentStore, type DocSummary } from '../core/persistence';
import { authHeaders } from '../auth/session';

// Cloud-first storage. If the server reports storage isn't configured (501) or is unreachable,
// transparently fall back to localStorage so the app still works (e.g. local dev before Supabase).
const local = new DocumentStore(localStorage);
let localMode = false;

async function call(path: string, init: RequestInit): Promise<Response> {
  return fetch(`/api/docs${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...authHeaders(), ...(init.headers ?? {}) },
  });
}

export async function listDocs(): Promise<DocSummary[]> {
  if (localMode) return local.list();
  try {
    const res = await call('', { method: 'GET' });
    if (res.status === 501) { localMode = true; return local.list(); }
    if (!res.ok) throw new Error('list failed');
    return await res.json();
  } catch { localMode = true; return local.list(); }
}

export async function getDoc(id: string): Promise<KnowflowDoc | null> {
  if (localMode) return local.load(id);
  try {
    const res = await call(`?id=${encodeURIComponent(id)}`, { method: 'GET' });
    if (res.status === 501) { localMode = true; return local.load(id); }
    if (!res.ok) return null;
    return (await res.json()) ?? null;
  } catch { localMode = true; return local.load(id); }
}

export async function saveDoc(doc: KnowflowDoc): Promise<void> {
  if (localMode) { local.save(doc); return; }
  try {
    const res = await call('', { method: 'PUT', body: JSON.stringify(doc) });
    if (res.status === 501) { localMode = true; local.save(doc); return; }
    if (!res.ok) throw new Error('save failed');
  } catch { localMode = true; local.save(doc); }
}

export async function removeDoc(id: string): Promise<void> {
  if (localMode) { local.remove(id); return; }
  try {
    const res = await call(`?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.status === 501) { localMode = true; local.remove(id); }
  } catch { localMode = true; local.remove(id); }
}
