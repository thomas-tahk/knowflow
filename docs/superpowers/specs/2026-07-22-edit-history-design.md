# Edit history — design

**Date:** 2026-07-22
**Status:** Design locked. Implementation not started (branch `feat/edit-history`).
**Implements:** Step 2 of `2026-07-19-backend-persistence-and-ai-provenance-course.md`

## Problem

Step 1 made official flows editable in place by anyone with the app password. A bad save
is now shared with the whole team instantly, and **the previous version ceases to exist**.
The only recovery is `npm run seed:flows --force`, which resets all 13 flows to the
bundled originals — destroying every good edit made since seeding.

## What we are building

1. **A second table, `document_versions`** — append-only. The server copies the *outgoing*
   row into it before every overwrite, automatically. Nothing the client does can skip it.
2. **Restore** — loading an old version and saving it as the new current, through the
   normal save path. The version being replaced is archived by the same mechanism, so
   **restores are themselves undoable; nothing is ever destroyed**.
3. **A History view in the editor** — list of versions for the open flow; preview one
   read-only; restore behind a confirm.
4. Archive-on-delete for drafts (data kept; no undelete UI in v1 — recovery via SQL).

## Schema (user runs by hand in Supabase SQL Editor, BEFORE the code deploys)

```sql
create table document_versions (
  id bigint generated always as identity primary key,
  doc_id text not null,
  title text,
  data jsonb not null,          -- the full KnowflowDoc as it was
  doc_updated_at text,          -- the version's own conflict token, as the doc carried it
  archived_at timestamptz not null default now()
);
create index document_versions_by_doc on document_versions (doc_id, archived_at desc);
```

Same ordering rule as step 1: **table first, then deploy.** The archive write fails loudly
(see below), so deploying against a missing table would break saves.

## Decisions

### 1. Archive the outgoing row inside `saveDoc`, server-side

The client cannot be trusted to archive (any client bug or old tab silently loses the
safety net). `saveDoc` already reads the existing row for server-owned fields; it now
reads `title, data` too, and inserts the old row into `document_versions` before writing.

### 2. Noise control: skip unchanged content, coalesce bursts

Two facts make naive archive-per-save unusable:

- **Autosave debounce is 600ms** (`useAutosave.ts:16`). One editing session = dozens to
  hundreds of saves.
- **Opening a flow fires a save of identical content**: `useAutosave` skips only the very
  first doc on mount; every later `resetDoc` (open/switch/follow) triggers a save 600ms on.
  Without a guard, merely *browsing* flows would mint versions of unchanged documents.

Rules, applied in order on every save of an existing row:

1. **Skip if content unchanged** — `existing.updated_at === doc.meta.updatedAt`. The
   token is minted fresh by every edit operation (`core/operations.ts touch`), so an
   identical token means an identical doc. Kills the browse-noise case exactly.
2. **Coalesce within 10 minutes** — skip if the newest version row for this doc was
   archived less than 10 minutes ago. One editing burst → one version (the state from
   just before the burst began). Long sessions still get a snapshot every ~10 minutes.

### 3. Archive failure fails the save, loudly

If the history insert errors, the save returns 500 and the editor shows "⚠ Not saved".
The alternative — save anyway — silently drops the safety net, which is the same defect
class as the seed script that exited 0 having done nothing. A safety net that can be
absent without anyone noticing is not a safety net.

Consequence: the table must exist before the code deploys (ordering above).

### 4. Restore goes through the normal save path

No new write endpoint. The client fetches the version's `data`, mints a fresh
`meta.updatedAt`, and calls the existing save with the current conflict token as base.
This reuses, for free: the conflict check (someone else editing concurrently gets the
normal conflict flow), server-owned status/topic/order (a restored official flow stays
official), and archiving (the replaced current version lands in history).

Restore of an official flow bypasses the unlock speed-bump: the restore confirm *is* the
deliberate act. The confirm copy states that the current version is archived first.

### 5. Preview never touches the live doc state

Preview renders the version in the existing canvas **as a separate state variable**
(`preview`), leaving the editor's `doc` untouched. The autosave hook only watches `doc`,
so previewing *cannot* trigger a save of old content over the current version — safe by
construction rather than by a guard flag. Banner over the canvas: "Viewing version from
<time> — Restore this version · Back to current". Editing stays disabled in preview.

### 6. History is server-side only

In `unconfigured`/`offline` mode the History view says history is unavailable — versions
live in Postgres, not localStorage. localStorage docs are single-browser scratch anyway.

## API

`api/versions.ts` (new Vercel function; remember the ESM `.js` import extension), GET only,
password-gated like `api/docs.ts`:

- `GET /api/versions?docId=<id>` → `[{ id, docId, title, archivedAt }]` newest first
- `GET /api/versions?id=<versionId>` → the full `KnowflowDoc` (the `data` blob)

Server functions `listVersions` / `getVersion` live in `src/server/docs.ts` (same table
family, shares the client). Dev middleware mirror added in `vite.config.ts` alongside
`/api/docs`. 501/StorageNotConfigured mapping identical to docs.

## UI

- "⋯ More" menu gains **Version history** → modal (same pattern as GeneratePanel):
  rows of `<relative time> · <title>` with **Preview** and **Restore** buttons.
- Preview closes the modal and shows the version read-only in the canvas + banner.
- Restore confirms, then: direct `saveDoc(restored, base)` → `resetDoc(restored)` →
  unlock state set for official flows → preview/modal cleared. ConflictError → the
  existing conflict modal.
- The official-flow unlock confirm copy updates: "there is no version history yet" →
  now history exists and mistakes can be undone.

## Testing

Server (extend `src/server/docs.test.ts`; mock gains per-table routing):

- Save over an existing row archives the outgoing row (data, title, doc_updated_at).
- Save with unchanged content (same updated_at token) archives nothing.
- Archive skipped when the newest version is <10 min old; proceeds when older.
- Brand-new doc archives nothing.
- Archive insert failure rejects the save; nothing written to `documents`.
- `deleteDoc` archives the draft row before deleting; official delete still refused
  with nothing archived.
- `listVersions` maps rows; `getVersion` returns the blob.

Plus: build clean, lint at the 22-error baseline, all existing tests green.

## Non-goals

- **Who** made each edit — unrepresentable without identity; history records what/when.
- Diffs between versions.
- Undelete UI (delete archives data; recovery is manual).
- Pruning/retention caps — coalescing keeps growth modest; revisit if it ever matters.
