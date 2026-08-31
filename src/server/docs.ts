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

/** How much of the library a caller may read.
 *  - `all`      — authenticated: official flows plus the team's own drafts.
 *  - `official` — anonymous: curated flows only. Team drafts are work-in-progress and must
 *                 never reach someone who merely holds the public URL.
 *  Enforced in the SQL query rather than by filtering the result, so an anonymous request
 *  never pulls a draft over the wire in the first place. */
export type ReadScope = 'all' | 'official';

export async function listDocs(scope: ReadScope = 'all'): Promise<DocSummary[]> {
  const base = client().from(TABLE).select('id,title,preset,status,updated_at,topic,sort_order');
  const { data, error } = await (scope === 'official' ? base.eq('status', 'official') : base)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    id: r.id, title: r.title, preset: r.preset, status: r.status, updatedAt: r.updated_at,
    group: r.topic ?? undefined, sortOrder: r.sort_order ?? undefined,
  }));
}

export async function getDoc(id: string, scope: ReadScope = 'all'): Promise<KnowflowDoc | null> {
  const base = client().from(TABLE).select('data').eq('id', id);
  const { data, error } = await (scope === 'official' ? base.eq('status', 'official') : base).maybeSingle();
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
 *  or the newest version is under 10 minutes old (coalesces autosave bursts).
 *  `force` (the restore path) bypasses only the recency check: a restore replaces the
 *  current version wholesale, and coalescing it away would destroy that state — the
 *  exact loss this table exists to prevent. Clients can force MORE archiving, never less. */
async function archiveOutgoing(c: SupabaseClient, existing: ExistingRow, doc: KnowflowDoc, force: boolean): Promise<void> {
  if (existing.updatedAt === doc.meta.updatedAt) return;
  if (!force) {
    const { data, error } = await c.from(VERSIONS_TABLE)
      .select('archived_at').eq('doc_id', doc.id).order('archived_at', { ascending: false }).limit(1);
    if (error) throw new Error(error.message);
    const newest = data?.[0]?.archived_at;
    if (newest && Date.now() - new Date(newest).getTime() < COALESCE_MS) return;
  }
  await insertVersion(c, doc.id, existing);
}

export async function saveDoc(doc: KnowflowDoc, base?: string | null, opts?: { forceArchive?: boolean }): Promise<void> {
  const c = client();

  // Saving can never change status, topic or order: they are read back from the stored row,
  // never taken from the client. Without this, any client could mark its own doc 'official'
  // (and, with the delete guard below, make it undeletable through the app).
  const existing = await readExisting(c, doc.id);
  const status = existing?.status ?? 'draft';

  // The outgoing row is archived before every overwrite, server-side, so no client bug
  // can skip the safety net. Failure here fails the whole save (throws).
  if (existing) await archiveOutgoing(c, existing, doc, opts?.forceArchive === true);


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

/** Thrown when the targeted flow has no row. */
export class NotFound extends Error {
  constructor(message = 'No such flow.') { super(message); this.name = 'NotFound'; }
}

/** Thrown when a reorder list no longer matches the topic it claims to order. */
export class StaleOrder extends Error {
  constructor(message = 'That ordering is out of date — reload and try again.') {
    super(message); this.name = 'StaleOrder';
  }
}

/** Where a flow sits in the library: published or not, under which heading, in which position. */
export interface Placement {
  status?: 'draft' | 'official';
  /** Blank or null files the flow under no heading — only legal for a draft. */
  topic?: string | null;
  sortOrder?: number;
}

/** Highest position currently used in a topic, or null when the topic is empty. */
async function lastPosition(c: SupabaseClient, topic: string): Promise<number | null> {
  const { data, error } = await c.from(TABLE)
    .select('sort_order').eq('topic', topic).order('sort_order', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  const top = data?.[0]?.sort_order;
  return typeof top === 'number' ? top : null;
}

/**
 * Move a flow within the library: publish it, refile it under another topic, reorder it, or
 * demote it back to a draft.
 *
 * Deliberately separate from `saveDoc`, which still refuses to read status/topic/order off the
 * client. Editing content and changing where a flow lives are different intents, and keeping
 * them apart means no autosave can publish anything by accident.
 *
 * Content is untouched, so nothing is archived and `updated_at` is left alone — bumping it
 * would invalidate the conflict token of an editor someone has open elsewhere.
 */
export async function setPlacement(id: string, placement: Placement): Promise<void> {
  const c = client();
  const existing = await readExisting(c, id);
  if (!existing) throw new NotFound();

  const status = placement.status ?? existing.status;
  const requested = placement.topic === undefined ? existing.group : placement.topic;
  const asked = requested?.trim() ? requested.trim() : null;
  // Topics are a property of the published library; a draft is filed nowhere.
  const topic = status === 'official' ? asked : null;

  // A published flow with no topic would render under no heading — invisible in the library.
  if (status === 'official' && !topic) throw new Error('Publishing needs a topic.');

  let sortOrder: number | null;
  if (status !== 'official') sortOrder = null;                       // drafts have no position
  else if (placement.sortOrder !== undefined) sortOrder = placement.sortOrder;
  else if (topic === existing.group) sortOrder = existing.sortOrder; // staying put: keep position
  else sortOrder = ((await lastPosition(c, topic!)) ?? -1) + 1;      // new topic: append

  // The blob carries its own copy of status; the two must never disagree (see saveDoc).
  const data = existing.data && typeof existing.data === 'object'
    ? { ...(existing.data as KnowflowDoc), meta: { ...(existing.data as KnowflowDoc).meta, status } }
    : existing.data;

  const { error } = await c.from(TABLE).update({ status, topic, sort_order: sortOrder, data }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Rewrite every position in a topic to 0..n-1 in the order given.
 *
 * Rewriting the whole list rather than swapping neighbours means the result is always dense and
 * unambiguous. The caller's list must name exactly the topic's current flows: a mismatch means
 * the client is working from a stale library (someone else published or refiled meanwhile), and
 * applying it would file a flow at the wrong position or drop one out of the ordering entirely.
 */
export async function reorderTopic(topic: string, orderedIds: string[]): Promise<void> {
  const c = client();
  const { data, error } = await c.from(TABLE).select('id').eq('topic', topic).eq('status', 'official');
  if (error) throw new Error(error.message);

  const current = new Set((data ?? []).map(r => String(r.id)));
  const given = new Set(orderedIds);
  if (current.size !== given.size || [...given].some(id => !current.has(id))) throw new StaleOrder();

  for (const [position, id] of orderedIds.entries()) {
    const { error: e } = await c.from(TABLE).update({ sort_order: position }).eq('id', id);
    if (e) throw new Error(e.message);
  }
}
