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

- **`src/library/starterFlows.ts`** — exports `STARTER_FLOWS: KnowflowDoc[]`. Each has a **stable reserved id** using a `starter:` prefix (e.g. `starter:password-changed`, `starter:2fa`) so links between starter flows resolve deterministically and never collide with generated ids.
- **`src/library/flows.ts`** — a thin resolver layer over `src/data/library.ts` that the editor uses instead of calling `library.ts` directly:
  - `listFlows()` → starter summaries (flagged `starter: true`) **+** stored `DocSummary[]`.
  - `resolveFlow(id)` → returns the starter flow if `id` starts with `starter:`, else delegates to `getDoc(id)`.
  - Save/delete continue to target `library.ts` and are **rejected for `starter:` ids** (bundled flows are read-only; see below).
- The Diagrams panel groups the list: a **"Starter flows"** section (from `STARTER_FLOWS`) above **"Your flows"** (stored). Starter rows carry a small badge and have no delete button.

### Seed content (initial)

Ship at least one real, linked pair so link-following is demonstrable on day one:

- `starter:password-changed` — the Password-Changed troubleshooting flow. Its `2FA` outcome node has `linkTo: 'starter:2fa'`.
- `starter:2fa` — the 2FA sub-procedure as its own flow.

The user authors additional starter flows over time (by building them in-app and promoting the exported JSON into `starterFlows.ts`, or by hand).

## Editing bundled flows — copy to edit

Starter flows are **read-only when viewed**; the canonical set stays pristine and a fresh instance always resets clean.

- When the active flow is a starter (`id` starts with `starter:`), the editor is in a **read-only view**: Palette and destructive/edit controls are disabled or hidden, autosave is off.
- A prominent **"Make an editable copy"** action forks it: deep-clone → assign a fresh non-`starter:` id → title `"<title> (copy)"` → `meta.status = 'draft'` → save to the library → open the copy. The copy's `linkTo` values are left pointing at their original targets (a copy can still link to canonical starter flows).

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
2. `starterFlows.ts` (the Password-Changed ↔ 2FA pair) + `flows.ts` resolver.
3. Diagrams panel lists starter flows (grouped, badged, no delete).
4. Door affordance on linked nodes + follow control + Back history.
5. Starter flows open read-only (no fork yet — just view + navigate).

**Slice 2 — author & extend:**
6. Inspector "Links to flow →" picker (set/clear on owned flows).
7. "Make an editable copy" fork.
8. Broken-link render/notice polish.

**Deferred (noted, not built):** flow-level "related flows" list · bird's-eye map (derived from links) · links in the accessible view (blocked on that view existing).

## Testing

- **`core`:** `linkTo` round-trips through serialize/persistence; validation flags a broken `linkTo` as a warning (not an error); setting/clearing `linkTo` via the edit operation.
- **`library/flows`:** `listFlows` merges starter + stored; `resolveFlow` returns starter by prefix and delegates otherwise; save/delete reject `starter:` ids.
- **Navigation:** follow pushes history and swaps active flow; Back pops; opening from the panel clears history; following a broken link is a no-op.
- **Fork:** copy of a starter flow gets a fresh id, `(copy)` title, draft status, is saved, and retains its `linkTo` targets.
- Existing suite (77 tests) stays green; `tsc -b` + `vite build` clean.
