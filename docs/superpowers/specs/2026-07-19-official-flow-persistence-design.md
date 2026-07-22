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

**Nothing is expected to force a change.** Ids are opaque strings — no constraint comes
from Postgres, Supabase, Vercel or the code; forks receive fresh ids so collisions cannot
arise; and the ids would survive a migration off Supabase entirely. The only realistic
pressure is cosmetic (a flow renamed conceptually, and someone feeling the id should
match), which should be resisted.

The existing guard rail is the tripwire: `starterFlows.test.ts:52` asserts every `linkTo`
resolves to a real flow, so an id change that orphans a link fails the suite before it
ships. That invariant must be extended to cover seeded rows.

### 5. `status` cannot change on save; delete of official is refused

> **The server applies no judgment and has no criterion.** It does not decide which flows
> deserve to be official. The rule is mechanical: *saving a flow cannot change whether it
> is official* — the server keeps whatever the row already had, the same way saving a
> document cannot change who owns it.


`api/docs.ts:19-20` passes the client's document straight to `saveDoc` with **no
validation**, and `src/server/docs.ts:43` writes `status: doc.meta.status` — the value
the client sent. As it stands, any client can save a document with
`meta.status = 'official'`.

Combined with the delete guard below, that would let anyone create a flow **nobody can
delete through the app**. A permission model keyed off a client-controlled field
protects nothing.

- A normal save never changes status; the value is read from the existing row (or
  defaults to `draft` for new documents).
- Promotion to `official` happens **only via the seed script**, never through the app.
- `deleteDoc` reads the row's status first and refuses when it is `official`.

**Who has final say, and why this is not deferred authorization.** Promotion happens
outside the app, by running a script that requires the Supabase service key. The
"qualified individual" gate is therefore *physical access to the credential* — the
strongest control currently available, and it costs nothing to build.

The tripwire for when this stops being sufficient: **the day someone who is not the repo
owner needs to promote a flow without using a terminal.** At that point the cheap step is
a second admin secret gating an in-app promote action — defensible for a rare, high-stakes
operation even though it was rejected for everyday editing. Full user accounts are only
required if promotion rights must differ *between* team members.

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

## Backend availability: pausing, keep-alive, and the offline indicator

### The failure mode is scheduled, not hypothetical

Supabase pauses Free Plan projects after roughly **7 days** of insufficient database
activity. Two properties make this serious:

- **A paused project does not wake on request.** Restoring it requires opening the
  Supabase dashboard and clicking *Resume project*. The app stays broken until a human
  intervenes.
- **Restoration expires.** After 90 days paused, the project can no longer be restored
  through Studio; recovery means downloading backups and migrating to a new project.

A service desk consults flows during incidents rather than daily — precisely the usage
profile that gets paused. This also retroactively strengthens decision 3: the bundled
modules are not insurance against a rare hiccup but against a **predictable recurring
event**. Without them, a paused project means the team opens the app and sees nothing.

### Keep-alive (removes the failure mode)

A daily GitHub Actions job issues one authenticated `GET /api/docs`, which runs a real
`select` against the `documents` table. Routing through the app's own API rather than
straight at Supabase exercises the full user path — Vercel function, password gate,
database query — so the job doubles as monitoring: `curl -f` fails on any non-2xx and
GitHub emails on a failed scheduled run.

Two caveats to carry into implementation:

- Verify empirically that read activity alone prevents pausing. The documentation says
  "a few user requests to the database each day" without distinguishing reads from
  writes. Confirm the project survives two quiet weeks before treating this as solved.
- GitHub disables scheduled workflows in repositories with no commits for 60 days, which
  would silently kill the keep-alive on a quiet repo. Include `workflow_dispatch` so it
  can be re-triggered by hand.

### Offline indicator (the backstop)

`src/data/library.ts` silently flips to `localMode` on 501 or network failure and tells
the user nothing. This change makes that materially worse: today those flows are honestly
read-only, but afterwards an offline user sees the *bundled* copies, edits one believing
they are fixing team content, and saves it to their own browser. It looks like it worked.
Nobody else ever sees it.

The indicator must distinguish two states, because they differ in severity:

| State | Meaning | Treatment |
|---|---|---|
| Not configured (501) | Local development, no Supabase | Quiet notice; harmless |
| Unreachable / paused | Backend down or paused — **changes are not shared** | Persistent, prominent |

Exact wording is settled during implementation. The requirement is that the second state
is never silent.

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
  no version history. A second append-only table fixes it whenever it is built.

  Scoping the risk honestly: the **original 13 flows are in git permanently** and the seed
  script restores them, so the curated baseline is never truly lost. What is at risk is
  only *improvements made after seeding* — a colleague's genuine correction clobbered by a
  later bad save. That is a real but much narrower exposure, which is why history is
  scheduled next rather than folded into step 1.

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
| Free-tier project pauses after ~7 days idle | Daily keep-alive cron; bundled modules keep the app usable meanwhile |
| Keep-alive itself silently stops | GitHub disables cron on repos idle 60 days — `workflow_dispatch` allows manual re-trigger |
| Code copies drift from rows | Modules are frozen seed material; never hand-edited |
| Confirm dialog read as security | State plainly that it is a speed-bump, not a permission |
| Bad edit destroys a post-seed improvement | Step 2 (history). Originals remain in git and restorable via seed |
| Seed run against the wrong project | Script requires an explicit env var; prints target before writing |
