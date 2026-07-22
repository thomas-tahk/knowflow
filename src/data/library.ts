import type { KnowflowDoc } from '../core/types';
import { DocumentStore, type DocSummary } from '../core/persistence';
import { authHeaders } from '../auth/session';

// Cloud-first storage. If the server reports storage isn't configured (501) or is unreachable,
// transparently fall back to localStorage so the app still works (e.g. local dev before Supabase).
const local = new DocumentStore(localStorage);

/**
 * Which store is actually serving reads and writes.
 * - `cloud`        — Supabase; work is shared with the team.
 * - `unconfigured` — no Supabase env vars (local dev). Harmless.
 * - `offline`      — backend unreachable or paused. **Work is NOT shared.** Must be visible:
 *                    Supabase free-tier projects pause after ~7 days idle and do not self-wake.
 */
export type StorageMode = 'cloud' | 'unconfigured' | 'offline';

let mode: StorageMode = 'cloud';
const listeners = new Set<() => void>();

function setMode(next: StorageMode): void {
  if (mode === next) return;
  mode = next;
  listeners.forEach(fn => fn());
}

export function getStorageMode(): StorageMode {
  return mode;
}

/** Subscribe to storage-mode changes. Returns an unsubscribe function. */
export function subscribeStorageMode(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

const usingLocal = (): boolean => mode !== 'cloud';

/** The stored copy changed since we opened it — caller decides keep-mine vs take-theirs. */
export class ConflictError extends Error {
  constructor() { super('conflict'); this.name = 'Conflict'; }
}

/** The server refused the operation because the target is an official flow. */
export class ProtectedError extends Error {
  constructor(message = 'This flow is protected.') { super(message); this.name = 'Protected'; }
}

async function call(path: string, init: RequestInit): Promise<Response> {
  return fetch(`/api/docs${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...authHeaders(), ...(init.headers ?? {}) },
  });
}

export async function listDocs(): Promise<DocSummary[]> {
  if (usingLocal()) return local.list();
  try {
    const res = await call('', { method: 'GET' });
    if (res.status === 501) { setMode('unconfigured'); return local.list(); }
    if (!res.ok) throw new Error('list failed');
    return await res.json();
  } catch { setMode('offline'); return local.list(); }
}

export async function getDoc(id: string): Promise<KnowflowDoc | null> {
  if (usingLocal()) return local.load(id);
  try {
    const res = await call(`?id=${encodeURIComponent(id)}`, { method: 'GET' });
    if (res.status === 501) { setMode('unconfigured'); return local.load(id); }
    if (!res.ok) return null;
    return (await res.json()) ?? null;
  } catch { setMode('offline'); return local.load(id); }
}

export async function saveDoc(doc: KnowflowDoc, base?: string | null): Promise<void> {
  if (usingLocal()) { local.save(doc); return; }
  try {
    const res = await call('', { method: 'PUT', body: JSON.stringify({ doc, base }) });
    if (res.status === 501) { setMode('unconfigured'); local.save(doc); return; }
    if (res.status === 409) throw new ConflictError();
    if (res.status === 403) throw new ProtectedError();
    if (!res.ok) throw new Error('save failed');
  } catch (e) {
    // Deliberate refusals must surface; only transport failures fall back to local.
    if (e instanceof ConflictError || e instanceof ProtectedError) throw e;
    setMode('offline'); local.save(doc);
  }
}

/** One entry in a document's version history. */
export interface VersionSummary {
  id: number;
  docId: string;
  title: string | null;
  archivedAt: string;
}

// Version history is server-side only (versions live in Postgres, not localStorage),
// so there is no local fallback here — callers check getStorageMode() first and show
// "history unavailable" outside cloud mode.
export async function listVersions(docId: string): Promise<VersionSummary[]> {
  const res = await fetch(`/api/versions?docId=${encodeURIComponent(docId)}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Could not load version history.');
  return res.json();
}

export async function getVersion(id: number): Promise<KnowflowDoc | null> {
  const res = await fetch(`/api/versions?id=${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Could not load that version.');
  return (await res.json()) ?? null;
}

export async function removeDoc(id: string): Promise<void> {
  if (usingLocal()) { local.remove(id); return; }
  try {
    const res = await call(`?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.status === 501) { setMode('unconfigured'); local.remove(id); return; }
    if (res.status === 403) throw new ProtectedError('Official flows cannot be deleted.');
    if (!res.ok) throw new Error('delete failed');
  } catch (e) {
    if (e instanceof ProtectedError) throw e;
    setMode('offline'); local.remove(id);
  }
}
