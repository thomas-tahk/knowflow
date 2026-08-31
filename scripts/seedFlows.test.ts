import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { buildSeedRows, editedInApp } from './seedFlows';
import { STARTER_FLOWS, STARTER_GROUPS } from '../src/library/starterFlows';

const run = promisify(execFile);

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

// The unit tests above import buildSeedRows directly, so they all passed while
// `npm run seed:flows` was a silent no-op: its entry guard matched process.argv[1] against
// the filename, which is the vite-node binary, not the script. Only running the real command
// catches that, so this asserts the command actually reaches main().
describe('npm run seed:flows', () => {
  it('reaches main() and refuses to run without credentials', async () => {
    const env = { ...process.env };
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_KEY;

    const failure = await run('npm', ['run', 'seed:flows'], { env }).then(
      () => null,
      (e: { code?: number; stderr?: string }) => e,
    );

    expect(failure, 'command exited 0 — it silently did nothing').not.toBeNull();
    expect(failure?.code).toBe(1);
    expect(failure?.stderr).toContain('Missing SUPABASE_URL');
  }, 60_000);
});

describe('editedInApp — the guard against re-seeding over app edits', () => {
  const seed = buildSeedRows();
  const first = seed[0];

  it('flags a flow whose stored copy has a newer updated_at than the bundle', () => {
    const stored = [{ id: first.id, title: 'Reset Password', updated_at: '2030-01-01T00:00:00.000Z' }];
    expect(editedInApp(stored, seed)).toEqual(['Reset Password']);
  });

  it('says nothing about a flow that still matches the bundle', () => {
    const stored = [{ id: first.id, title: first.title, updated_at: first.updated_at }];
    expect(editedInApp(stored, seed)).toEqual([]);
  });

  it('ignores rows that are not part of the seed at all', () => {
    const stored = [{ id: 'some-team-draft', title: 'Draft', updated_at: '2030-01-01T00:00:00.000Z' }];
    expect(editedInApp(stored, seed)).toEqual([]);
  });

  it('falls back to the id when a stored row has no title', () => {
    const stored = [{ id: first.id, title: null, updated_at: '2030-01-01T00:00:00.000Z' }];
    expect(editedInApp(stored, seed)).toEqual([first.id]);
  });
});
