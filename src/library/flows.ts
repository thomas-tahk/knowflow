import type { KnowflowDoc } from '../core/types';
import type { DocSummary } from '../core/persistence';
import { listDocs, getDoc } from '../data/library';
import { STARTER_FLOWS, STARTER_GROUPS } from './starterFlows';

export interface FlowSummary extends DocSummary {
  /** True for curated team content: read-only until deliberately unlocked. */
  official: boolean;
}

/**
 * Curated flows are identified by status, not by id.
 *
 * This deliberately replaces the old `id.startsWith('starter:')` test. Once the curated flows
 * live in the database, an id-prefix check would still treat them as untouchable bundle
 * content and the whole change would be inert.
 */
export function isOfficial(doc: { meta: { status: string } }): boolean {
  return doc.meta.status === 'official';
}

/** Topic + position for each bundled flow, used only when a row is missing (offline / unseeded). */
const BUNDLED_PLACEMENT = new Map<string, { group: string; sortOrder: number }>(
  STARTER_GROUPS.flatMap(g => g.flows.map((f, i) => [f.id, { group: g.title, sortOrder: i }] as const)),
);

function summarize(d: KnowflowDoc): FlowSummary {
  const placement = BUNDLED_PLACEMENT.get(d.id);
  return {
    id: d.id, title: d.title, preset: d.preset, status: d.meta.status, updatedAt: d.meta.updatedAt,
    group: placement?.group, sortOrder: placement?.sortOrder,
    official: isOfficial(d),
  };
}

/**
 * A stored document, falling back to the bundled copy when no row exists.
 * The row always wins — bundled modules are seed material and an offline fallback, not truth.
 */
export async function resolveFlow(id: string): Promise<KnowflowDoc | null> {
  const stored = await getDoc(id);
  if (stored) return stored;
  const bundled = STARTER_FLOWS.find(f => f.id === id);
  return bundled ? structuredClone(bundled) : null;
}

/**
 * All flows for the Diagrams panel: stored rows, plus any bundled flow that has no row yet.
 * A bundled flow appears only when its id is absent from storage, so seeded flows are never
 * listed twice.
 */
export async function listFlows(): Promise<FlowSummary[]> {
  const stored = await listDocs();
  const storedIds = new Set(stored.map(s => s.id));
  const unseeded = STARTER_FLOWS.filter(f => !storedIds.has(f.id)).map(summarize);
  return [
    ...stored.map(s => ({ ...s, official: s.status === 'official' })),
    ...unseeded,
  ];
}
