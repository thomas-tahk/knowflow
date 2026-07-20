# knowflow — Course after the supervisor review

**Date:** 2026-07-19
**Status:** Plan of record. Nothing here is built yet.
**Read this first next session.**

## Where things stand

Merged + live: **#7** (security incident intake flows + fishbone renderer fix),
**#6** (generation model bump), **#8** (flows-list grouping: collapsible
`Account & Access` / `Security Incident Intake` topics, Disabled Account moved to
Account & Access).

The Service Desk supervisor and several team members reviewed it and were
impressed with the process visualization and the speed of delivery. Two concerns
came out of that review; both are legitimate and both are confirmed below.

---

## Concern 1 — Curated flows are static bundle content, not backend data (CONFIRMED)

**The instinct was right.** The app has two tiers of flow, and they are not alike:

| Tier | Where it lives | Editable? | Who can add one |
|---|---|---|---|
| **Starters** (all 13 curated flows) | `src/library/flows/*.ts` — TypeScript modules compiled into the JS bundle | No, read-only | Only via a code change + Vercel deploy |
| **Library / "Team flows"** | Supabase, via `saveDoc` → `PUT /api/docs` (`src/data/library.ts`), localStorage fallback | Yes | Anyone using the app |

Evidence: `src/library/starterFlows.ts` aggregates 13 imported constants into
`STARTER_GROUPS` / `STARTER_FLOWS`. `isStarter()` is just an `id.startsWith('starter:')`
check, and `resolveFlow()` returns a `structuredClone` of the in-memory constant —
it never touches the backend.

**Everything the supervisor saw is the static tier.**

### Why this matters
- Adding or correcting a curated flow requires a code change and a deploy. Only the
  repo owner can do it. **The team cannot fix an error they spot** — which defeats the
  point of team-owned process documentation.
- Curated content is duplicated into every client's JS bundle and grows it over time.
- "Read-only" is currently enforced by an accident of architecture (it's code), not by
  an intentional permission model.

### Recommended fix — promote curated flows to backend documents with an "official" tier
**Key lever:** `KnowflowDoc.meta.status` **already supports `'official'`** (the bundled
flows already set it). The data model already has the concept; only storage ignores it.

1. Move the 13 curated flows out of code and into Supabase rows with `meta.status = 'official'`.
2. Keep the code modules **only** as a one-time seed / offline bootstrap — not the source of truth.
3. Protect official docs **server-side** (guard delete/overwrite by status) instead of
   protecting them by being uneditable code.
4. The read-only ↔ editable toggle then becomes meaningful: view official → "Edit this
   flow" (confirm) → edit in place if permitted, or fork into a team copy.

### Open design questions (brainstorm before coding)
- Seeding/migration mechanism: one-time SQL seed vs. seed-if-absent on boot. Note the
  re-seed-after-delete trap, and that a client-side seed writes to the shared library as
  a side effect of merely opening the app.
- Who may edit an official flow? Everyone, or a privileged role? There is no auth/role
  model today beyond a shared library.
- Does the offline/localStorage fallback still need bundled copies to work with no backend?
- Fork semantics: copy id/title conventions, and how a fork relates to its origin.

---

## Concern 2 — The demo flows were made by a process the in-app AI cannot reproduce (VALID)

The 9 security flows were produced over **many turns** of human + Opus iteration against
the supervisor's source diagrams and write-up, with domain review each round. The in-app
feature (`src/server/generate.ts`) is **one call, one `tool_use`, one diagram** — a
first-draft generator. PR #6 bumped the model id; verify the current value on `main`
(this worktree predates that merge). **The gap is the iteration loop, not the model.**

Risk: the supervisor may reasonably believe "paste a KB → get that quality," which the
app does not do today.

**Recommended: do both.**
- **(a) Say it plainly.** Tell the supervisor the curated flows were hand-built with AI
  assistance and domain review; the in-app generator produces a first draft to edit.
- **(b) Close the gap.** Make refinement a real in-app feature — generate → edit/comment →
  refine or regenerate a section — rather than a single shot. This is the honest route to
  comparable quality, and it is a genuinely good feature.

---

## Other problems worth flagging (not raised in review)

- **Silent local-vs-cloud divergence.** If `/api/docs` fails or returns 501, `data/library.ts`
  flips to `localMode` and writes to localStorage. The user is not told. They may believe
  work is saved to the shared backend when it is only on one device. **Surface the mode in the UI.**
- **Shared-library blast radius.** One shared library, and delete is one confirm dialog from
  permanent. With team adoption, accidental deletion of shared content is a real risk.
  Official-tier protection mitigates part of this.
- **No ownership/authorship model** beyond `meta.author = 'knowflow'`; no per-user scoping.
- **Concurrency is implemented but unproven** — `ConflictError` with keep-mine/take-theirs
  exists, but has not been exercised by real concurrent team use.

---

## Recommended sequence

1. **Backend-persisted "official" flows** (Concern 1). Biggest structural fix; unblocks team ownership.
2. **Read-only ↔ editable toggle / fork-to-edit.** Lands naturally on top of #1.
3. **AI refine loop + expectation-setting** (Concern 2).
4. **Hardening:** local-vs-cloud mode indicator, delete protection, concurrency.

Deferred / lower value for now: fishbone fidelity (colors, on-rib labels, legends,
annotation arrows), palette + spacing polish, ownership-map depth, regen `docs/DEPLOY.html`.

## Next session: start here
Brainstorm the **storage + seeding design for step 1** before writing any code.
The migration path and the permission model are the decisions to lock first.
