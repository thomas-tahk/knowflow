# knowflow — Linked Flows (design)

**Date:** 2026-07-14
**Status:** design approved, spec under review
**Supersedes/extends:** `docs/specs/2026-06-11-knowflow-design.md` (adds one field to the document model; changes nothing existing)

## Why

Opening knowflow today lands you on an empty Diagrams panel — *"No saved diagrams yet."* — and a blank canvas. That barren cold-start is the real reason momentum stalled: the app asks you to do all the work before it returns any value.

This feature fixes that by **seeding knowflow with curated, real troubleshooting flows that are present the moment you open it**, and by letting **any flow link to another whole flow** so those flows can be big and real without collapsing into one unreadable wall of boxes.

The mental model is a **web of complete flows** (like linked web pages), not a hierarchy. There is no "parent/child" or "drill into a sub-diagram." A node in one flow can *link to* another flow; following the link jumps you there; a Back control returns you.

### Success criteria

- Open the app with an empty library and **the curated starter flows are already listed**, no setup, no backend.
- In the **Password Changed** flow, the **2FA** node is visibly a link; clicking it opens the **2FA** flow full-canvas.
- A **Back** control returns you to Password Changed.
- All of the above works with **Supabase unreachable** (offline).
- The existing editor, renderers, exporters, validators, and 77 tests are unaffected.

## Non-goals (this spec)

- Flow-level "related flows" list (links not anchored to a node). *Maybe later.*
- A bird's-eye "map" view of the whole web. *Derivable from links later; not built now.*
- Representing links in the accessible / read-aloud narrative view. *That view does not exist yet; out of scope until it does.*
- Node create/connect UX friction (tracked separately — KNOWN-ISSUES #1b, #3).
- Any Supabase / backend change.

## Domain vocabulary

- **Flow** — a `KnowflowDoc`. Unchanged. "Flow" is the user-facing word for a diagram in this feature.
- **Link** — a node's pointer to another flow's id (`Block.linkTo`).
- **Door** — a node that has a `linkTo` set. Rendered with a visible link affordance.
- **Starter flow** — a curated flow that ships bundled in the app as data. Read-only when viewed; forked to edit.
- **Back history** — the browser-style stack of flows you followed links through; Back pops it.

## Data model

One optional field is added to `Block` in `src/core/types.ts`:

```ts
export interface Block {
  id: string;
  type: BlockType;
  text: string;
  categoryId?: string;
  position?: { x: number; y: number };
  size?: { w: number; h: number };
  /** Link/"door": id of another KnowflowDoc this node opens. Absent → normal node. */
  linkTo?: string;
}
```

Rationale for a node-level id reference (vs. embedding a sub-diagram, or a separate map artifact):

- Flows are already self-contained documents with stable ids in a shared library. A link is just one document referencing another — near-zero new machinery.
- Gives the **web** shape for free: any node → any flow, a shared flow (e.g. "escalate to tier 2") linkable from many places, cycles allowed, orphans fine.
- Every renderer/exporter/validator keeps working unchanged because each flow is still a plain `KnowflowDoc`.

### Broken links

A `linkTo` whose target id resolves to nothing (bundled flow removed, deleted library doc) is a **soft** condition, never a crash:

- Validation surfaces it as a **warning** (`ValidationError` with a `link/*` code), not a hard error — flows with a broken link still render and save.
- The door renders in a muted "broken link" state and following it is a no-op with a small inline notice.

## Bundled starter content

Curated flows ship as data in the repo, load with **zero backend**, and appear alongside stored flows.

- **`src/library/starterFlows.ts`** — exports `STARTER_FLOWS: KnowflowDoc[]`. Each has a **stable reserved id** using a `starter:` prefix (e.g. `starter:reset-password`, `starter:2fa`) so links between starter flows resolve deterministically and never collide with generated ids.
- **`src/library/flows.ts`** — a thin resolver layer over `src/data/library.ts` that the editor uses instead of calling `library.ts` directly:
  - `listFlows()` → starter summaries (flagged `starter: true`) **+** stored `DocSummary[]`.
  - `resolveFlow(id)` → returns the starter flow if `id` starts with `starter:`, else delegates to `getDoc(id)`.
  - Save/delete continue to target `library.ts` and are **rejected for `starter:` ids** (bundled flows are read-only; see below).
- The Diagrams panel groups the list: a **"Starter flows"** section (from `STARTER_FLOWS`) above **"Your flows"** (stored). Starter rows carry a small badge and have no delete button.

### Seed content (initial batch — confirmed 2026-07-15)

Four real, interlinked flows ship in the first batch. Full node/branch/link structure is in **Appendix A**; slugs and link relationships:

| Slug | Title | Links out to |
|---|---|---|
| `starter:verification` | Verification | *(shared/reusable — linked into by others)* |
| `starter:reset-password` | Reset Password | `starter:verification` |
| `starter:2fa` | 2FA — Google 2-Step | `starter:verification`, `starter:set-no2fa-ou` |
| `starter:set-no2fa-ou` | Set OU to No2FA | *(shared/reusable — linked into by 2FA)* |

**Verification** and **Set OU to No2FA** are deliberately factored out as small reusable flows that others link into — the pattern the wider web will follow.

**This is a batch, not the ceiling.** More starter flows (printing, and a broader "Big Password Issues" triage hub that links out to these) are expected over time. The architecture is built so adding one = appending a `KnowflowDoc` to `STARTER_FLOWS` plus a link or two — it never requires touching existing flows. See *Maintaining & extending starter flows* below.

## Editing bundled flows — copy to edit

Starter flows are **read-only when viewed**; the canonical set stays pristine and a fresh instance always resets clean.

- When the active flow is a starter (`id` starts with `starter:`), the editor is in a **read-only view**: Palette and destructive/edit controls are disabled or hidden, autosave is off.
- A prominent **"Make an editable copy"** action forks it: deep-clone → assign a fresh non-`starter:` id → title `"<title> (copy)"` → `meta.status = 'draft'` → save to the library → open the copy. The copy's `linkTo` values are left pointing at their original targets (a copy can still link to canonical starter flows).

## Maintaining & extending starter flows

Starter flows are living procedures — they change (a vendor renames a button, a policy shifts) and the set grows. Two supported edit paths, plus one helper that makes structural edits painless:

- **Small text tweaks** → edit the node's string directly in `starterFlows.ts` and push. One-liner.
- **Structural changes / new procedures** → **fork → edit visually → export → paste → push**: "Make an editable copy" of the starter, edit it with the full editor, then **"Export as starter"** (below) to get the updated data, paste it over that entry in `starterFlows.ts`, and push.
- **Adding a whole new starter flow** (printing, a "Big Password Issues" triage hub, etc.) → author it in-app, "Export as starter", append the entry to `STARTER_FLOWS`, wire its `linkTo`s. **Existing flows are never touched** — the web grows by addition.

Push auto-deploys (Vercel watches `main`), so the loop ends at "push." Every change is a git commit — a version history and rollback for the canonical procedures, for free.

### "Export as starter" helper

A small action (in the ⋯ More menu) on any flow: serializes the active flow via the existing `exportJson`, prompts for a slug (`printing` → `starter:printing`), rewrites the `id` to that `starter:` slug, and copies a ready-to-paste `STARTER_FLOWS` entry to the clipboard. This is what keeps structural editing visual instead of hand-written JSON. Trades off nothing existing — it's a read-only convenience over `exportJson`.

## Navigation — follow & back

Following a link swaps the canvas to the target flow; Back returns. Browser-style history handles loops and shared flows with no special-casing.

- Editor state gains a **history stack** of visited flow ids. `EditorScreen` owns it.
- **Follow:** activating a door resolves `linkTo` via `resolveFlow`, pushes the current flow id onto the stack, and loads the target as the active flow. Following a broken/missing target does nothing but show the inline notice.
- **Back:** pops the stack and loads the previous flow. Hidden/disabled when the stack is empty.
- Opening a flow directly from the Diagrams panel **clears** the history (fresh starting point), matching the "pick a flow to start" mental model.
- Autosave already persists edits to owned flows before you navigate away; starter flows are read-only so navigating away from them is clean.

### Door affordance & the edit/follow distinction

In the editor a plain node click **selects** for editing, so following needs its own control (not a bare click):

- A door node renders a visible link affordance — a small **"↗ open"** control / link icon on the node plus distinct styling — so it reads as a doorway.
- Activating that control (click / Enter) follows the link. Plain-clicking the node still selects it (so you can edit its text or change its target).
- *(Later option, not in this spec: a read-only "Follow mode" for agents working a live call, where the whole node is clickable-to-follow. The affordance above is forward-compatible with it.)*

## Authoring links

On flows you own (non-starter), the **Inspector** gains a **"Links to flow →"** control:

- A picker listing other flows (starter + your own, excluding the current flow) to set `Block.linkTo`, plus a **"None"** option to clear it.
- Setting/clearing a link is a normal edit operation (autosaved, undoable via existing history).
- No new preset vocabulary — any block type can become a door.

## What stays untouched

- `src/core/types.ts` — only the additive `linkTo?` field.
- Presets, validators (except an additive soft link-warning), layout, renderers, exporters, `useDocHistory`, autosave: unchanged in behavior.
- `src/data/library.ts` and the `/api/*` functions: unchanged. The new `flows.ts` resolver wraps them; it does not modify them.
- Supabase, auth, deploy: untouched.

## Build order

**Slice 1 — fixes barren-ness (the day-one win):**
1. `Block.linkTo` field + soft broken-link validation.
2. `starterFlows.ts` (the four confirmed flows — Appendix A) + `flows.ts` resolver.
3. Diagrams panel lists starter flows (grouped, badged, no delete).
4. Door affordance on linked nodes + follow control + Back history.
5. Starter flows open read-only (no fork yet — just view + navigate).

**Slice 2 — author & extend:**
6. Inspector "Links to flow →" picker (set/clear on owned flows).
7. "Make an editable copy" fork.
8. "Export as starter" helper (the extend-the-set loop).
9. Broken-link render/notice polish.

**Deferred (noted, not built):** flow-level "related flows" list · bird's-eye map (derived from links) · links in the accessible view (blocked on that view existing).

## Testing

- **`core`:** `linkTo` round-trips through serialize/persistence; validation flags a broken `linkTo` as a warning (not an error); setting/clearing `linkTo` via the edit operation.
- **`library/flows`:** `listFlows` merges starter + stored; `resolveFlow` returns starter by prefix and delegates otherwise; save/delete reject `starter:` ids.
- **Navigation:** follow pushes history and swaps active flow; Back pops; opening from the panel clears history; following a broken link is a no-op.
- **Fork:** copy of a starter flow gets a fresh id, `(copy)` title, draft status, is saved, and retains its `linkTo` targets.
- Existing suite (77 tests) stays green; `tsc -b` + `vite build` clean.

## Appendix A — confirmed starter flow structures

All four render as the **flowchart** preset. Node kinds below map to flowchart block types (`step` / `decision` / `outcome`). "→ **DOOR** `starter:x`" marks a node whose `linkTo` is set. Wording is the confirmed content; the executor encodes it verbatim into `starterFlows.ts` (assigning ids, connections, and auto-layout positions).

### `starter:verification` — "Verification" *(shared)*
- **decision** "Staff, or Student / Parent?"
  - *Staff* → **step** "Get name and eNumber (ID), plus ONE of: Department / Location, or previous ticket info" → *(to the gate)*
  - *Student / Parent* → **step** "Get student ID and student name" → **decision** "Who is actually on the call?"
    - *Student* → **step** "Get school and grade" → *(to the gate)*
    - *Parent* → **step** "Get parent name, email, home address (also ask school and grade)" → *(to the gate)*
    - *Staff for a student* → **step** "Also verify them as Staff" → *(into the Staff step above)*
- **decision** (the gate) "Could the customer provide the required info?"
  - *Yes* → **outcome** "Identity verified → return to your flow"
  - *No — verify in person* → **decision** "Can the customer visit Tech Oasis in person?"
    - *Yes* → **outcome** "Refer out to Tech Oasis (customer goes there in person)"
    - *No* → **outcome** "Refer out to a field tech (tech visits the customer)"
  - *No — will follow up* → **outcome** "Customer gathers info and calls back later (or gives up)"

### `starter:reset-password` — "Reset Password"
- **step** "Verify caller identity" → **DOOR** `starter:verification`
- **step** "Reset to the monthly default (temporary) password at directory.aps.edu/rDirectory"
- **step** (P) "Customer opens pwreset.aps.edu and clicks 'Change my password'"
- **step** "1 · CAPTCHA (word on desktop / math on mobile)"
- **step** "2 · Log in (username + temporary password)"
- **step** "3 · Set new password (meets requirements; no personal info; not a reused password)"
- **decision** "Submit"
  - *Success* → **outcome** "Password has been changed (confirmation message)"
  - *Failed, first time* → *(loop back to step P, 'Change my password')*
  - *Failed again (2nd+)* → **step** "Set a PERMANENT password directly in rDirectory (skip pwreset; UNCHECK 'Change password upon next login')" → **outcome** "Password has been changed"

### `starter:2fa` — "2FA — Google 2-Step"
- **step** "Verify caller identity" → **DOOR** `starter:verification`
- **decision** "Is 2FA OFF or ON? (check in Google Admin)"
  - *OFF* → **decision** "New employee?"
    - *Yes* → **step** "Enroll for 2-Step Verification (first-time login only)" → *(into step S below)*
    - *No* → **step** "Set OU to No2FA" → **DOOR** `starter:set-no2fa-ou` → **step** "Turn OFF Login Challenge (~10 min)" → **step** (N) "Profile icon → Manage Google Account → Security → 2-Step Verification (may re-enter password)" → **step** (S) "Under 'Second steps' → Phone → add backup phone → Next → Save → (maybe Approve)" → **step** "Return (←) to the 2-Step Verification page" → **step** "Turn ON 2-Step Verification"
      - *Confirmed* → **step** "'You are now protected with 2-Step Verification'" → *(to Restore)*
      - *Not working* → **step** "Restart browser and retry; remote in if you can" → *(loop back to step N)*
  - *ON* → **step** "Set OU to No2FA" → **DOOR** `starter:set-no2fa-ou` → **step** "Google Admin → Security → 2-Step Verification → try to set it OFF (wait a few minutes)"
    - *Can turn OFF* → *(into 'Turn OFF Login Challenge' in the OFF path)*
    - *Cannot turn OFF* → **step** "Get Backup Verification Codes" → **step** "Give the customer one 8-digit backup code" → **step** "Guide: 'Try another way' at the prompt → enter the code" → **step** "Open the 2-Step Verification page → 'Phones' under Second steps" → **step** "Add new phone (remove old if needed) → green check" → **step** "Phone updated" → *(to Restore)*
- **step** (Restore) "Set the OU back to the ORIGINAL (the one you noted at the start)" — both success paths flow through here
- **outcome** "Done — resolved and OU restored"

> Note for the executor: the two resolution confirmations ("now protected", "phone updated") are **step** nodes, not terminal outcomes — they have an outgoing edge into Restore. The only terminal outcome is "Done — resolved and OU restored."

### `starter:set-no2fa-ou` — "Set OU to No2FA" *(shared)*
- **step** "Note the original Org Unit (OU)"
- **step** "Change OU to: aps.edu › Staff › GoogleNoSync › No2FA"
- **step** "Refresh the page to confirm the OU updated"
- **outcome** "OU set → return to your flow"

*(Restoring the original OU lives at the end of the 2FA flow, not here — this sub-flow only sets it to No2FA. If many future flows change the OU, a paired "Restore original OU" sub-flow can be extracted later.)*
