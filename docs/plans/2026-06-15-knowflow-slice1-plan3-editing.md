# knowflow Slice 1 — Plan 3: Editing UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the read-only canvas (Plan 2) into an intuitive editor. The user can select any part, edit its text, change its type, add/remove blocks, and — for the three React Flow presets — drag to reposition and drag handles to resize. Every change is an immutable operation on the one `KnowflowDoc`, and the document autosaves to the browser.

**Architecture:** Editing stays pure-function-first. The canvas surfaces *intent* (selected this, dragged that to here, typed this text) and calls a small set of operations from `src/core/operations.ts`; the returned new doc flows back down as the single source of truth. Manual placement is modeled as **optional per-block overrides** (`position`, `size`) on the document — auto-layout computes the default, an override wins when present. A right-hand **Inspector** edits the selected block; a **Palette** adds new blocks; **autosave** debounces the doc into the existing `DocumentStore`.

**Tech Stack:** React 19 + Vite + TypeScript, `@xyflow/react` v12, Vitest. Builds on Plan 1 core (`docs/plans/2026-06-12-knowflow-slice1-foundation.md`) and Plan 2 canvas (`docs/plans/2026-06-13-knowflow-slice1-plan2-canvas.md`).

**This is Plan 3 of the Slice 1 / demo-MVP arc.** Plan 4 = save/load UI + PDF/PNG export. Plan 5 = AI text+image generation.

**Verified library facts (React Flow v12, from official docs):**
- Editable canvas: `nodesDraggable`, `elementsSelectable` true; commit position on `onNodeDragStop(_, node)` (node.position is top-left, the same convention our adapter uses).
- Resize: `<NodeResizer>` from `@xyflow/react` rendered *inside* a custom node, shown when `selected`; `onResizeEnd(_, params)` gives `{width, height, x, y}`. Requires the node CSS to allow the element to fill (`width:100%; height:100%`).
- Controlled nodes: seed `useNodesState` from derived nodes, re-sync via `useEffect` when the doc identity changes; commit drag/resize back to the doc (doc stays source of truth, React Flow holds transient interaction state).
- `'@xyflow/react/dist/style.css'` already imported in `DiagramCanvas`.

---

## Design decisions locked for this plan

- **Doc is the single source of truth.** React Flow never owns state long-term; on drag/resize *end* we write an override into the doc, then nodes re-derive. No live per-pixel doc churn.
- **Manual placement = overrides, not replacement.** New optional `Block.position?` / `Block.size?`. Auto-layout still runs; the adapter prefers the override when present. "Reset layout" (clears overrides) is a one-line op we expose as a toolbar button so a user can always get back to a clean auto-layout.
- **Fishbone editing is text + structure only this plan** (add/remove/edit categories & causes, edit the effect text, via Inspector + Palette). Drag/resize of fishbone parts is explicitly deferred (custom SVG; flagged to the user). Its selection is already wired.
- **Inspector is type-aware.** The block-type dropdown only offers types valid for the current preset (`getPreset(preset).blockTypes`). For fishbone, the Palette offers "Add category" / "Add cause (to selected category)".
- **Autosave, not Save button** (Save/load UI is Plan 4). Debounced write to `DocumentStore` under the doc's id.

## File Structure

- `src/core/types.ts` — extend `Block` with optional `position?`, `size?`.
- `src/core/operations.ts` — add `moveBlock`, `resizeBlock`, `resetLayout`.
- `src/layout/sizes.ts` — add `effectiveSize(block)` helper (override else shape default).
- `src/layout/graphLayout.ts` / `linearLayout.ts` — use `effectiveSize`; apply `position` override after compute.
- `src/canvas/adapter.ts` — node `position` = override ?? computed; pass `width/height` + `blockId` into node `data`.
- `src/canvas/KnowflowNode.tsx` — render `NodeResizer` when selected + editable; use effective size.
- `src/canvas/DiagramCanvas.tsx` — add `editable` mode: draggable/selectable, `onNodeDragStop`, resize commit, controlled nodes synced to doc.
- `src/editor/Inspector.tsx` — edit text / type / delete for the selected block (+ effect text for fishbone).
- `src/editor/Palette.tsx` — add-block buttons valid for the preset.
- `src/editor/EditorScreen.tsx` — composes toolbar + Palette + canvas + Inspector around one doc with autosave.
- `src/editor/useAutosave.ts` — debounced persistence hook.
- `src/App.tsx` — mount `EditorScreen` (seeded from a sample for now; AI/new-doc entry comes in Plan 5).

---

## Task 1: Extend the document model with placement overrides

**Files:** `src/core/types.ts`, `src/core/types.test.ts`

- [ ] **Step 1: Add optional fields to `Block`**

```ts
export interface Block {
  id: string;
  type: BlockType;
  text: string;
  /** Fishbone only: the category a cause attaches to. */
  categoryId?: string;
  /** Manual placement override (top-left, React Flow coords). Absent → auto-layout. */
  position?: { x: number; y: number };
  /** Manual size override. Absent → shape default. */
  size?: { w: number; h: number };
}
```

- [ ] **Step 2: Test** that a block with overrides still round-trips through `exportJson`/`importJson` (extend an existing serialize test or add one asserting `position`/`size` survive).
- [ ] **Step 3: Run `npm test`** — green.
- [ ] **Step 4: Commit** `feat(core): per-block position/size overrides`.

---

## Task 2: Placement operations

**Files:** `src/core/operations.ts`, `src/core/operations.test.ts`

- [ ] **Step 1: Write failing tests** for `moveBlock`, `resizeBlock`, `resetLayout`:
  - `moveBlock(doc, id, {x,y}, clock)` sets `position` on that block only, bumps `updatedAt`, leaves others untouched.
  - `resizeBlock(doc, id, {w,h}, clock)` sets `size`.
  - `resetLayout(doc, clock)` strips `position` and `size` from every block.

- [ ] **Step 2: Implement** (mirrors existing immutable style):

```ts
export function moveBlock(doc: KnowflowDoc, blockId: string, position: { x: number; y: number }, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(b => (b.id === blockId ? { ...b, position } : b)) }, clock);
}

export function resizeBlock(doc: KnowflowDoc, blockId: string, size: { w: number; h: number }, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(b => (b.id === blockId ? { ...b, size } : b)) }, clock);
}

export function resetLayout(doc: KnowflowDoc, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(({ position: _p, size: _s, ...b }) => b) }, clock);
}
```

- [ ] **Step 3: Run `npm test`** — green.  **Step 4: Commit** `feat(core): move/resize/resetLayout operations`.

---

## Task 3: Effective size + overrides in layout

**Files:** `src/layout/sizes.ts`, `src/layout/graphLayout.ts`, `src/layout/linearLayout.ts`, tests

- [ ] **Step 1: Add `effectiveSize`** to `sizes.ts`:

```ts
import type { Block } from '../core/types';
import { styleFor } from '../canvas/blockStyles';

export function effectiveSize(block: Block): Size {
  if (block.size) return { width: block.size.w, height: block.size.h };
  return sizeForShape(styleFor(block.type).shape);
}
```

- [ ] **Step 2: Use it in `graphLayout` and `linearLayout`** (replace `sizeForShape(styleFor(b.type).shape)` with `effectiveSize(b)`), and after computing positions, apply the override: `positions[b.id] = b.position ?? computed`.
- [ ] **Step 3: Tests** — a block with a `position` override keeps exactly that position out of `graphLayout`; a block with a `size` override changes spacing. **Step 4: `npm test`** green. **Step 5: Commit** `feat(layout): honor per-block size/position overrides`.

---

## Task 4: Adapter carries size + ids into node data

**Files:** `src/canvas/adapter.ts`, `src/canvas/adapter.test.ts`

- [ ] **Step 1:** Extend `KnowflowNodeData` with `width: number; height: number` (from `effectiveSize`) and keep `blockType`/`text`. Node `position` = `block.position ?? positions[id] ?? {0,0}`.
- [ ] **Step 2: Tests** — node data includes width/height; an overridden position shows on the node. **Step 3: `npm test`** green. **Step 4: Commit** `feat(canvas): adapter passes size + honors position override`.

---

## Task 5: Resizable, size-aware custom node

**Files:** `src/canvas/KnowflowNode.tsx`, `src/canvas/KnowflowNode.css`

- [ ] **Step 1:** Use `data.width/height` for the node box size (instead of `sizeForShape` only). Render `<NodeResizer minWidth={90} minHeight={40} isVisible={selected} />` (import from `@xyflow/react`) so handles appear only on the selected node. Keep the diamond rotate technique; for diamonds keep aspect square via `keepAspectRatio`.
- [ ] **Step 2: CSS** — node root `width:100%; height:100%` so it fills the resized frame; style the resizer handles subtly (teal).
- [ ] **Step 3: Typecheck** `npx tsc --noEmit`. **Step 4: Commit** `feat(canvas): resizable node with NodeResizer`.

---

## Task 6: Editable DiagramCanvas

**Files:** `src/canvas/DiagramCanvas.tsx`

- [ ] **Step 1:** Add `editable?: boolean` and callbacks `onMove(id, pos)`, `onResize(id, size)` to props. When `editable`:
  - `nodesDraggable`, `elementsSelectable` true; seed `useNodesState` from derived nodes; re-sync in a `useEffect` keyed on `doc`.
  - `onNodeDragStop={(_, n) => onMove(n.id, n.position)}`.
  - On resize end (bubbled from the node via `onResize`), commit size.
  - Keep `onSelect` wired to selection.
- [ ] **Step 2:** Read-only mode unchanged (the default; fishbone still uses `FishboneCanvas`). **Step 3: Typecheck.** **Step 4: Commit** `feat(canvas): editable mode (drag to move, commit to doc)`.

---

## Task 7: Inspector panel

**Files:** `src/editor/Inspector.tsx`, `src/editor/Inspector.css`

A right-hand panel bound to the selected block. No unit test (UI; verified in the harness), but keep it a pure function of `{ doc, selectedId }` + callbacks.

- [ ] **Step 1:** Render, for the selected block:
  - a multiline **text** field → `onChangeText(id, text)` (calls `updateBlockText`),
  - a **type** dropdown limited to `getPreset(doc.preset).blockTypes` → `onChangeType(id, type)` (`swapBlockType`); hidden for `spine`,
  - for fishbone causes, a **category** dropdown → `recategorizeCause`,
  - a **Delete** button → `onDelete(id)` (`deleteBlock`; refuse to delete the lone `spine`).
  - Empty state when nothing selected: a short hint.
- [ ] **Step 2: Commit** `feat(editor): type-aware inspector`.

---

## Task 8: Palette

**Files:** `src/editor/Palette.tsx`, `src/editor/Palette.css`

- [ ] **Step 1:** A small toolbar of "add" buttons derived from the preset's `blockTypes`. Non-fishbone: "Add step / decision / outcome…" → `addBlock`, then auto-connect from the selected block (`addConnection`) for graph presets. Fishbone: "Add category" (→ new `category`) and "Add cause" (→ `cause` with `categoryId` = selected category, disabled until a category is selected).
- [ ] **Step 2:** Include a **Reset layout** button → `resetLayout`. **Step 3: Commit** `feat(editor): add-block palette + reset layout`.

---

## Task 9: Autosave hook

**Files:** `src/editor/useAutosave.ts`, `src/editor/useAutosave.test.ts`

- [ ] **Step 1: Test** (with fake timers + an in-memory `KeyValueStorage`) that rapid doc changes result in a single debounced `store.save` with the latest doc.
- [ ] **Step 2: Implement** `useAutosave(doc, store, delay=600)` — debounced effect calling `store.save(doc)`; returns a `'idle' | 'saving' | 'saved'` status for the toolbar.
- [ ] **Step 3: `npm test`** green. **Step 4: Commit** `feat(editor): debounced autosave`.

---

## Task 10: EditorScreen + wire-up + harness

**Files:** `src/editor/EditorScreen.tsx`, `src/editor/EditorScreen.css`, `src/App.tsx`

- [ ] **Step 1:** `EditorScreen` holds the doc in state, seeded from a sample (Plan 5 will seed from AI / new-doc). Layout: top toolbar (brand, title, autosave status, Reset layout) · left Palette · center canvas (`FishboneCanvas` for fishbone, editable `DiagramCanvas` otherwise) · right Inspector. All callbacks apply the matching operation with the real clock and `setDoc`. Track `selectedId` in state.
- [ ] **Step 2:** Replace the Plan 2 preset-switcher `App.tsx` with `EditorScreen`. Keep a small preset switcher in the toolbar (re-seeds from that preset's sample) so all four remain demoable.
- [ ] **Step 3: Run `npm run dev`** and verify by hand:
  - Select a block → Inspector fills; edit text → node + (fishbone) narration-ready text updates live.
  - Change type → restyles; add via Palette → appears and (graph) links from selection.
  - Drag a node → it stays where dropped after reload (override persisted); resize a node → size persists.
  - Reset layout → overrides cleared, clean auto-layout returns.
  - Delete works; lone spine can't be deleted.
  - Reload page → the edited doc is still there (autosave).
- [ ] **Step 4: Run `npm test && npm run build`** — all green, build succeeds. **Step 5: Commit** `feat(editor): editing screen wiring + autosave + harness`.

---

## Self-Review checklist (fill at execution)
- [ ] Doc remains the single source of truth; React Flow holds only transient interaction state.
- [ ] Overrides are additive and reversible (Reset layout).
- [ ] Fishbone limitation (no drag/resize yet) is the only deliberate gap; text+structure editing works there.
- [ ] No secrets, no network calls (AI is Plan 5).
- [ ] `npm test` + `npm run build` clean.
