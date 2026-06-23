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
- **Related pre-existing smell (NOT yet fixed):** `DiagramCanvas.tsx:38`
  `useEffect(() => { if (!connectMode) setPending(null) }, [connectMode])` trips
  `react-hooks/set-state-in-effect` — same anti-pattern family. Worth a separate cleanup.

### 1b. 🟡 Node spawn placement
New nodes spawn in a position the user dislikes; the auto-layout placement for freshly added
blocks needs tuning. Deferred — cosmetic, surfaced 2026-06-23 right after the crash fix.

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

## Meta
- A **thorough review pass** was requested (stop the whack-a-mole). It was interrupted before
  running. When run, append findings here so they're durable.
