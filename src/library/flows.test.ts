import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DocSummary } from '../core/persistence';

const listDocs = vi.fn<() => Promise<DocSummary[]>>();
const getDoc = vi.fn<(id: string) => Promise<unknown>>();
vi.mock('../data/library', () => ({ listDocs: () => listDocs(), getDoc: (id: string) => getDoc(id) }));

import { isOfficial, resolveFlow, listFlows, orderedTopics, type FlowSummary } from './flows';
import { STARTER_FLOWS } from './starterFlows';

const mine: DocSummary = { id: 'mine', title: 'Mine', preset: 'flowchart', status: 'draft', updatedAt: 'z' };

beforeEach(() => { listDocs.mockReset(); getDoc.mockReset(); getDoc.mockResolvedValue(null); });

describe('isOfficial', () => {
  it('keys off status, not the id prefix', () => {
    // The id prefix must NOT decide this: once curated flows are rows, a prefix check would
    // still treat them as untouchable bundle content and the whole change would be inert.
    expect(isOfficial({ meta: { status: 'official' } })).toBe(true);
    expect(isOfficial({ meta: { status: 'draft' } })).toBe(false);
  });
});

describe('resolveFlow', () => {
  it('prefers the stored row over the bundled copy of the same id', async () => {
    getDoc.mockResolvedValue({ id: 'starter:verification', title: 'Edited by the team' });
    const d = await resolveFlow('starter:verification');
    expect(d?.title).toBe('Edited by the team');
  });

  it('falls back to the bundled flow when no row exists, as a fresh clone', async () => {
    const d = await resolveFlow('starter:verification');
    expect(d?.id).toBe('starter:verification');
    expect(d).not.toBe(STARTER_FLOWS.find(f => f.id === 'starter:verification'));
  });

  it('returns null when the id is neither stored nor bundled', async () => {
    expect(await resolveFlow('starter:nope')).toBeNull();
    expect(await resolveFlow('unknown')).toBeNull();
  });
});

describe('listFlows', () => {
  it('lists bundled flows when nothing is seeded yet', async () => {
    listDocs.mockResolvedValue([mine]);
    const flows = await listFlows();
    expect(flows.filter(f => f.official).map(s => s.id)).toEqual(STARTER_FLOWS.map(s => s.id));
    expect(flows.filter(f => !f.official).map(s => s.id)).toEqual(['mine']);
  });

  it('does not list a flow twice once it has been seeded', async () => {
    const seeded: DocSummary = {
      id: 'starter:verification', title: 'Verification', preset: 'flowchart',
      status: 'official', updatedAt: 'z', group: 'Account & Access', sortOrder: 4,
    };
    listDocs.mockResolvedValue([seeded]);
    const flows = await listFlows();
    expect(flows.filter(f => f.id === 'starter:verification')).toHaveLength(1);
    // The row's own group/order win over the bundled placement.
    expect(flows.find(f => f.id === 'starter:verification')?.sortOrder).toBe(4);
  });

  it('marks stored rows official from their status', async () => {
    listDocs.mockResolvedValue([
      { ...mine, id: 'row-official', status: 'official', group: 'Account & Access', sortOrder: 0 },
      mine,
    ]);
    const flows = await listFlows();
    expect(flows.find(f => f.id === 'row-official')?.official).toBe(true);
    expect(flows.find(f => f.id === 'mine')?.official).toBe(false);
  });

  it('gives bundled fallbacks a group title and leaves team docs ungrouped', async () => {
    listDocs.mockResolvedValue([mine]);
    const flows = await listFlows();
    for (const s of flows.filter(f => f.official)) {
      expect(typeof s.group, `${s.id} group`).toBe('string');
      expect(typeof s.sortOrder, `${s.id} sortOrder`).toBe('number');
    }
    expect(flows.find(f => f.id === 'mine')?.group).toBeUndefined();
  });
});

describe('orderedTopics', () => {
  const flow = (group: string, official = true) =>
    ({ id: group + Math.random(), title: 't', preset: 'flowchart', status: official ? 'official' : 'draft',
       updatedAt: 'x', group, official }) as FlowSummary;

  it('keeps bundled topics in their curated order, not alphabetical', () => {
    const topics = orderedTopics([flow('Security Incident Intake'), flow('Account & Access')]);
    expect(topics).toEqual(['Account & Access', 'Security Incident Intake']);
  });

  it('appends topics invented in the app, alphabetically, after the bundled ones', () => {
    const topics = orderedTopics([flow('Printers'), flow('Account & Access'), flow('Hardware')]);
    expect(topics).toEqual(['Account & Access', 'Hardware', 'Printers']);
  });

  it('omits a topic no flow uses', () => {
    expect(orderedTopics([flow('Account & Access')])).toEqual(['Account & Access']);
  });

  it('ignores drafts — they are filed under no topic', () => {
    expect(orderedTopics([flow('Hardware', false)])).toEqual([]);
  });
});
