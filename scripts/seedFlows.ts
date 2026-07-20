/**
 * Seeds the curated flows into Supabase as official rows. Run by hand, once:
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npm run seed:flows
 *
 * Deliberately NOT automatic. Seeding on deploy or on app boot would resurrect flows the
 * team intentionally deleted, because "row is absent" cannot distinguish "never seeded"
 * from "deliberately retired".
 *
 * Idempotent: upserts by id, so running it twice yields 13 rows, not 26.
 *
 * Re-running restores the bundled version of every flow, discarding edits made in the app.
 * That is the intended "reset to the curated baseline" escape hatch — it is destructive to
 * later improvements, which is why it requires --force once rows already exist.
 */
import { createClient } from '@supabase/supabase-js';
import { STARTER_GROUPS } from '../src/library/starterFlows';

const TABLE = 'documents';

interface SeedRow {
  id: string;
  title: string;
  preset: string;
  status: 'official';
  description: string | null;
  data: unknown;
  updated_at: string;
  topic: string;
  sort_order: number;
}

/** Flatten the topic registry into rows, deriving group/sort_order from display order. */
export function buildSeedRows(): SeedRow[] {
  return STARTER_GROUPS.flatMap(topic =>
    topic.flows.map((flow, index) => ({
      id: flow.id,
      title: flow.title,
      preset: flow.preset,
      status: 'official' as const,
      description: flow.description ?? null,
      data: { ...flow, meta: { ...flow.meta, status: 'official' } },
      updated_at: flow.meta.updatedAt,
      topic: topic.title,
      sort_order: index,
    })),
  );
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY.');
    process.exit(1);
  }

  const rows = buildSeedRows();
  // Print the target so a mis-aimed run is obvious before anything is written.
  console.log(`Target : ${new URL(url).host}`);
  console.log(`Flows  : ${rows.length}`);

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing, error: readError } = await supabase
    .from(TABLE).select('id').in('id', rows.map(r => r.id));
  if (readError) { console.error(`Read failed: ${readError.message}`); process.exit(1); }

  const alreadyThere = existing?.length ?? 0;
  if (alreadyThere > 0 && !process.argv.includes('--force')) {
    console.error(
      `\n${alreadyThere} of these flows already exist.\n` +
      'Re-seeding overwrites them with the bundled copies, discarding any edits made in the app.\n' +
      'Re-run with --force if that is what you want.',
    );
    process.exit(1);
  }

  const { error } = await supabase.from(TABLE).upsert(rows);
  if (error) { console.error(`Seed failed: ${error.message}`); process.exit(1); }

  console.log(`\nSeeded ${rows.length} official flows.`);
}

// Only seed when run as a script. Importing this module (e.g. from tests) must not write
// to a database as a side effect.
if (process.argv[1]?.includes('seedFlows')) main();
