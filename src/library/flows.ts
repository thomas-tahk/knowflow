import type { KnowflowDoc } from '../core/types';
import type { DocSummary } from '../core/persistence';
import { listDocs, getDoc } from '../data/library';
import { STARTER_FLOWS } from './starterFlows';

export interface FlowSummary extends DocSummary {
  /** True for bundled, read-only starter flows. */
  starter: boolean;
}

/** Starter (bundled, read-only) flows use this id prefix; nothing else does. */
export function isStarter(id: string): boolean {
  return id.startsWith('starter:');
}

function summarize(d: KnowflowDoc): DocSummary {
  return { id: d.id, title: d.title, preset: d.preset, status: d.meta.status, updatedAt: d.meta.updatedAt };
}

/** A starter flow (by id, as a fresh clone) or a stored library doc. Null if neither. */
export async function resolveFlow(id: string): Promise<KnowflowDoc | null> {
  if (isStarter(id)) {
    const found = STARTER_FLOWS.find(f => f.id === id);
    return found ? structuredClone(found) : null;
  }
  return getDoc(id);
}

/** All flows for the Diagrams panel: bundled starters first, then stored docs. */
export async function listFlows(): Promise<FlowSummary[]> {
  const stored = await listDocs();
  return [
    ...STARTER_FLOWS.map(f => ({ ...summarize(f), starter: true })),
    ...stored.map(s => ({ ...s, starter: false })),
  ];
}
