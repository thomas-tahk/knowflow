import { describe, it, expect } from 'vitest';
import { buildSeedRows } from './seedFlows';
import { STARTER_FLOWS, STARTER_GROUPS } from '../src/library/starterFlows';

describe('buildSeedRows', () => {
  it('produces one row per curated flow', () => {
    expect(buildSeedRows()).toHaveLength(STARTER_FLOWS.length);
  });

  it('marks every row official, in both the column and the embedded blob', () => {
    for (const row of buildSeedRows()) {
      expect(row.status, row.id).toBe('official');
      expect((row.data as { meta: { status: string } }).meta.status, row.id).toBe('official');
    }
  });

  it('derives topic and order from the display registry', () => {
    const rows = buildSeedRows();
    for (const topic of STARTER_GROUPS) {
      const inTopic = rows.filter(r => r.topic === topic.title);
      expect(inTopic.map(r => r.id)).toEqual(topic.flows.map(f => f.id));
      expect(inTopic.map(r => r.sort_order)).toEqual(topic.flows.map((_, i) => i));
    }
  });

  it('is idempotent by id — no duplicates to upsert over each other', () => {
    const ids = buildSeedRows().map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every linkTo resolvable within the seeded set', () => {
    const rows = buildSeedRows();
    const ids = new Set(rows.map(r => r.id));
    for (const row of rows) {
      const blocks = (row.data as { blocks: { id: string; linkTo?: string }[] }).blocks;
      for (const b of blocks) {
        if (b.linkTo) expect(ids.has(b.linkTo), `${row.id}/${b.id} → ${b.linkTo}`).toBe(true);
      }
    }
  });
});
