import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DocSummary } from '../core/persistence';

const listDocs = vi.fn<() => Promise<DocSummary[]>>();
const getDoc = vi.fn<(id: string) => Promise<unknown>>();
vi.mock('../data/library', () => ({ listDocs: () => listDocs(), getDoc: (id: string) => getDoc(id) }));

import { isStarter, resolveFlow, listFlows } from './flows';
import { STARTER_FLOWS } from './starterFlows';

beforeEach(() => { listDocs.mockReset(); getDoc.mockReset(); });

describe('isStarter', () => {
  it('is true only for starter: ids', () => {
    expect(isStarter('starter:2fa')).toBe(true);
    expect(isStarter('abc-123')).toBe(false);
  });
});

describe('resolveFlow', () => {
  it('returns a starter flow by id (as a fresh clone, not the shared constant)', async () => {
    const d = await resolveFlow('starter:verification');
    expect(d?.id).toBe('starter:verification');
    expect(d).not.toBe(STARTER_FLOWS.find(f => f.id === 'starter:verification'));
  });

  it('returns null for an unknown starter id without hitting the library', async () => {
    expect(await resolveFlow('starter:nope')).toBeNull();
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('delegates non-starter ids to getDoc', async () => {
    getDoc.mockResolvedValue({ id: 'x' });
    const d = await resolveFlow('x');
    expect(getDoc).toHaveBeenCalledWith('x');
    expect((d as { id: string }).id).toBe('x');
  });
});

describe('listFlows', () => {
  it('lists starters (flagged) followed by stored docs', async () => {
    listDocs.mockResolvedValue([
      { id: 'mine', title: 'Mine', preset: 'flowchart', status: 'draft', updatedAt: 'z' },
    ]);
    const flows = await listFlows();
    const starters = flows.filter(f => f.starter);
    const stored = flows.filter(f => !f.starter);
    expect(starters.map(s => s.id)).toEqual(STARTER_FLOWS.map(s => s.id));
    expect(stored.map(s => s.id)).toEqual(['mine']);
  });
});
