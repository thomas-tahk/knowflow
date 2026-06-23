# knowflow — Known Issues / Backlog

> Recovered 2026-06-23 from session transcript `9695dca5` after the live review was
> interrupted by repeated Anthropic-side API 500s. Captured here so it survives context loss.

## Status legend
🔴 crash / blocker · 🟠 broken feature · 🟡 UX gap · ⚪ by-design (revisit) · ✅ done

## Fixed & on `main` (verify in prod)
- ✅ Shared cloud storage (Supabase) — **confirmed working in prod by user**.
- ✅ Text-edit no longer deselects the node while typing.
- ✅ Toolbar declutter (Tidy up / Export / Feedback / Clear under ⋯ More) + Saved✓/Saving…/⚠ pill.
- ✅ Docs serverless fn ESM import fix — `.js` extension (commit `69b2c47`).

## Open

### 1. ✅ FIXED — Blank-page crash when adding a node
Adding a new step/decision/etc. blanked the page; required refresh.
- **Console:** React error #185 ("Maximum update depth exceeded"), thrown in React Flow's
  internal `<StoreUpdater>` (`setNodes`/`setEdges`).
- **Root cause (confirmed via render instrumentation):** a *bidirectional* selection loop in
  `src/canvas/DiagramCanvas.tsx`. App `selectedId` was pushed into React Flow via the `nodes`
  prop's `selected` flag, AND `onSelectionChange` read React Flow's selection back into
  `selectedId`. The push and pull never reached a fixed point — `selectedId` oscillated
  (newId ↔ null) every render, re-pushing nodes each time → StoreUpdater re-synced forever.
- **Fix:** made selection one-directional (push only). Removed the `onSelectionChange`
  write-back; selection is now set from explicit `onNodeClick` / `onEdgeClick` / `onPaneClick`.
  Also stabilized the four canvas callbacks (`onMove`/`onResize`/`onConnect`/`onDeleteConnection`)
  to `useCallback` with functional `setDoc` updates. Verified in live browser: add-node no
  longer crashes; renders settle.
- **Related pre-existing smell (✅ FIXED 2026-06-23):** `DiagramCanvas.tsx:38`
  `useEffect(() => { if (!connectMode) setPending(null) }, [connectMode])` tripped
  `react-hooks/set-state-in-effect`. Replaced with the React previous-value render pattern
  (`wasConnectMode` guard) — behavior-identical (clears the in-progress connection when
  leaving connect mode), no effect. eslint clean.

### 1b. 🟡 Node spawn placement — DEFERRED (needs design input)
New nodes spawn in a position the user dislikes. **Root:** `operations.ts addBlock` creates the
block with no `position`, so Dagre places it as a disconnected node wherever it lands. The fix
is a *design decision* — should a new node appear next to the selected node, auto-connect to it,
drop at the bottom of the flow, etc.? No single correct answer, so left for the user. Cosmetic.

### 2. ✅ FIXED — AI "Generate" button errored (ERR_MODULE_NOT_FOUND)
`/api/generate` had the same native-ESM import bug the docs fn had, but a deeper import chain:
`api/generate.ts` → `../src/server/generate` → shared `src/core` files. The one-line
`.js`-extension fix did not cover the whole chain.
- **Root cause (confirmed):** native ESM forbids both extensionless relative imports *and*
  directory imports. `.js` was missing on every value import in the runtime chain, AND
  `../core/presets` is a *directory* — naively appending `.js` gives a non-existent
  `presets.js`; it must point at `presets/index.js`.
- **Fix:** added `.js` to value (runtime) relative imports across the chain, and `/index.js`
  to the `presets` directory import. Files: `api/generate.ts`, `src/server/generate.ts`,
  `src/server/buildDoc.ts`, `src/server/diagramTool.ts`, `src/core/presets/index.ts`,
  `src/core/presets/decisionTree.ts`, `src/core/createDoc.ts`. Type-only imports left
  extensionless (erased at runtime) — matches the docs.ts fix convention.
- **Verified** with a faithful loop that mirrors Vercel: esbuild-transpile the chain to `.js`
  (per-file, no bundle), then load the compiled `api/generate.js` under native ESM — went from
  `ERR_MODULE_NOT_FOUND` (red) to clean resolve (green). Build + all 77 tests still pass.
- **Note:** sibling fns `feedback.ts` / `login.ts` have no relative imports — not affected.

### 3. 🟡 Inline on-node text editing
Node text is a static label; all editing is forced into the right-side Inspector panel, which
pulls the user's attention off the diagram. Make text editable directly on the node
(e.g. double-click to edit in place). Well-scoped, acknowledged.

### 4. ⚪ Collaborators must refresh to see changes
No live sync — a second viewer sees edits only on reload. Currently **by design**. Revisit later
if real-time collaboration is wanted (would need polling or Supabase realtime subscriptions).

### 5. ✅ FIXED — PNG/PDF export clipped tall/wide diagrams
Export only captured the on-screen slice; a tall flowchart came out truncated (reported 2026-06-23).
- **Root cause:** `exporters.ts captureRaw` captured the `.canvas` element at its visible
  `clientWidth/clientHeight`. `.canvas` is `position:absolute; inset:0` (fixed visible box), but
  both renderers keep content in a pan/zoom-**transformed** layer that extends beyond it →
  off-screen parts clipped.
- **Fix:** capture the full content at scale 1 regardless of current pan/zoom, dispatching per
  renderer. **React Flow:** measure node bounds from the DOM (`.react-flow__node` transforms +
  offset sizes), then capture `.react-flow__viewport` with an explicit
  `translate(...) scale(1)` and image dims sized to those bounds. **Fishbone SVG:** capture
  `svg.fb-svg` at its full `viewBox` size with the pan/zoom transform reset to `none`. Both add a
  24px margin. Verified API against @xyflow v12 (`getNodesBounds`/`getViewportForBounds` available;
  ended up using DOM measurement so the exporter stays a plain module, no component plumbing).
- **NOT browser-verified by automation** (no Playwright; html-to-image needs real layout) —
  build + 77 tests green, but final visual confirmation is the user's live test.

## Meta
- A **thorough review pass** was requested (stop the whack-a-mole). It was interrupted before
  running. When run, append findings here so they're durable.
