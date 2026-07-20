# Official flow persistence — design

**Date:** 2026-07-19
**Status:** Design locked. No code written yet.
**Implements:** Step 1 of `2026-07-19-backend-persistence-and-ai-provenance-course.md`

## Problem

All 13 curated flows live in `src/library/flows/*.ts` — TypeScript modules compiled
into the JS bundle. They are read-only by accident of architecture, not by design.
Adding or correcting one requires a code change and a Vercel deploy, so **the team
cannot fix an error they spot**. That defeats the point of team-owned process
documentation.

This design moves those flows into Supabase rows carrying `meta.status = 'official'`,
keeps the code modules as an offline fallback only, and adds the server-side rules
that make "official" mean something.

## Decisions

Five decisions were locked during brainstorming. Each records the rationale, because
the reasoning matters more than the choice if this gets revisited.

### 1. Anyone with the app password may edit an official flow, behind a confirm

There is no user identity in this app. `api/docs.ts:9` compares a shared password
(`x-app-password`) against `APP_PASSWORD`; `api/login.ts` does the same. No token,
no expiry, no username. A request cannot say *who* is making it, so role-based rules
are not merely unbuilt — they are unrepresentable.

Given that, official flows are editable by anyone who is already in, gated by a
deliberate confirmation dialog.

> **This is a speed-bump, not a permission.** It prevents accidents, not intent.
> Say this plainly to the supervisor; nobody should believe official flows are locked.

Real auth is deferred until the team has actually adopted the tool. Adding it later
slots on top of this design without redoing it.

### 2. Grouping moves to columns; the topic list stays in code

`STARTER_GROUPS` (`src/library/starterFlows.ts`) holds topic titles, display order and
`defaultCollapsed` — all in code. The `documents` table has no group or ordering column
and `listDocs` sorts by `updated_at DESC`. Promoting flows to rows without addressing
this would silently destroy the topic grouping shipped in PR #8.

- `group` (text, nullable) and `sort_order` (int, nullable) become real columns.
- The topic list itself stays a short static array, since it changes rarely.

Real columns rather than fields inside the `data` blob: the database has to sort and
group by these, and it cannot see inside jsonb without awkward, slow path queries.
Content stays in the blob; anything queried or sorted by gets promoted to a column.

### 3. Seeding is a one-time manual script; modules stay bundled

`npm run seed:flows` reads the 13 existing modules and upserts them by id. It runs
by hand, once. It never runs on deploy and never on app boot.

**The trap this avoids:** "flow is absent" is ambiguous — it can mean *never seeded*
or *deliberately retired*. Any mechanism that seeds on absence resurrects flows the
team intentionally removed, forever. Seeding on deploy has the same defect on a
slower clock. Seeding on boot additionally writes to the shared library as a side
effect of opening the app, with every client racing.

The code modules remain in the bundle as the offline fallback.

> **Accepted cost:** there are now two copies of each flow — the row (authoritative)
> and the code copy (backup). Editing in the app leaves the code copy stale. Treat
> the modules as frozen seed material and never hand-edit them again. Accepted because
> losing the whole library when Supabase hiccups is worse than drift.

### 4. Ids stay exactly as they are

`linkTo` stores raw id strings **inside the JSON blob** — `secIntake.ts` alone has
five, with more across `resetPassword`, `twoFactor`, `secRemediation` and
`secCompromisedAccount`. Ids are a link graph, not just keys. Renaming one later means
rewriting the row id *and* every `linkTo` string inside every other document's JSON,
plus any team forks by then.

The `starter:` prefix becomes a slight misnomer. That is cosmetic and not worth
migration risk. Ids are opaque keys; new official flows created in-app will get
ordinary generated ids, and a mixed id space is fine.

### 5. The server owns `status`; delete of official is refused

`api/docs.ts:19-20` passes the client's document straight to `saveDoc` with **no
validation**, and `src/server/docs.ts:43` writes `status: doc.meta.status` — the value
the client sent. As it stands, any client can save a document with
`meta.status = 'official'`.

Combined with the delete guard below, that would let anyone create a flow **nobody can
delete through the app**. A permission model keyed off a client-controlled field
protects nothing.

- Status is server-decided. A normal save can never change it; the value is read from
  the existing row (or defaults to `draft` for new documents).
- Promotion to `official` happens only via the seed script or an explicit promote path.
- `deleteDoc` reads the row's status first and refuses when it is `official`.

Delete is treated asymmetrically from edit on purpose: edits are visible and
correctable, deletes are silent and permanent, and this app has no history.

Note `src/server/generate.ts:59` already validates AI-generated documents. The save
path simply never received the same treatment.

## Data model

```
documents
  id           text  pk
  title        text
  preset       text
  status       text        -- already exists: 'draft' | 'official'
  description  text  null
  data         jsonb       -- the whole KnowflowDoc
  updated_at   text
+ group        text  null  -- 'Account & Access'
+ sort_order   int   null  -- position within the topic
```

`status` already round-trips through Postgres (`src/server/docs.ts:30,43`). Only the
two new columns require a migration.

## Read path

1. `listFlows()` asks the backend for rows, now including `group` and `sort_order`.
2. Rows with `status = 'official'` render grouped by `group`, ordered by `sort_order`,
   with topics in the order given by the static topic array.
3. Rows with `status = 'draft'` render as Team flows, as today.
4. If the backend is unreachable, fall back to the bundled modules as today.
5. When a row and a bundled module share an id, **the row wins**; modules only fill gaps.

`isStarter()` currently tests `id.startsWith('starter:')`. Read-only-ness must key off
`status === 'official'` instead, or the seeded rows would still be treated as untouchable
bundle content and the change would be inert.

## Offline mode indicator

`src/data/library.ts` silently flips to `localMode` on 501 or network failure and tells
the user nothing.

This change makes that materially worse. Today those flows are honestly read-only. After
this change, an offline user sees the *bundled* copies, edits one believing they are
fixing team content, and saves it to their own browser. It looks like it worked. Nobody
else ever sees it.

Requirement: when `localMode` is active, show a persistent, visible indicator that the
app is working offline and changes are not shared. Wording to be settled during
implementation; the requirement is that the state is never silent.

## Non-goals

Explicitly out of scope, and safely deferrable — these add columns or policies later
without rewriting this work:

- User accounts, roles, per-user ownership or authorship.
- Migrating from the service key to Supabase RLS.
- Splitting the single shared library into scopes.
- Fork-to-edit. Decision 1 makes editing in place the primary path, so forking is
  no longer required for step 1.

Deferred but **scheduled next**, because the mechanism is cheap later while the lost
data is not:

- **Edit history (step 2).** Overwriting an official flow is unguarded and this app has
  no version history, so a mangled save destroys hand-built work permanently. A second
  append-only table fixes it whenever it is built, but nothing lost before then is
  recoverable.

## Testing

- Seed script is idempotent — running it twice produces 13 rows, not 26.
- A save carrying `meta.status = 'official'` from the client does **not** promote a
  draft document.
- `DELETE` on an official row is refused.
- `DELETE` on a draft row still succeeds.
- Official rows render grouped and ordered, matching the current UI.
- Row wins over bundled module when both share an id.
- Backend unreachable falls back to bundled modules and surfaces the offline indicator.
- Existing `starterFlows.test.ts` and `flows.test.ts` follow the read-path change.
  `starterFlows.test.ts:52` asserts every `linkTo` resolves within the bundled set;
  that invariant must still hold for the seeded rows.

## Risks

| Risk | Mitigation |
|---|---|
| Code copies drift from rows | Modules are frozen seed material; never hand-edited |
| Confirm dialog read as security | State plainly that it is a speed-bump, not a permission |
| Bad edit destroys a curated flow | Step 2 (history). Seed script is a partial undo until then |
| Seed run against the wrong project | Script requires an explicit env var; prints target before writing |
