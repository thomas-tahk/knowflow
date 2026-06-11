# knowflow — Design Spec

**Date:** 2026-06-11
**Status:** Approved design, pre-implementation
**Supersedes/extends:** `docs/brainstorm/2026-06-10-decisions.md`

## Purpose

A web app that turns service-desk knowledge (KB articles, personal notes) into clear, consistent, editable visual aids — without learning Visio or graphics software. Users pick a preset, optionally let AI draft a diagram from pasted text, then refine it with simple block-level edits. Diagrams are living documents shared in a team library with a single approver (team lead) who decides the official version of each process.

**Motivating problems:** (1) a team lead reprinting paper versions of a fishbone diagram for handling disabled accounts per user type — version drift on paper; (2) the wish to visualize a body of text quickly without a learning curve; (3) a partially-blind teammate whose read-aloud software gets nothing from diagram images.

**Timeline goal:** usable by the team within a few weeks of 2026-06-11.

## Core principles

- **Presets do the layout thinking.** A preset is a small vocabulary of building blocks plus automatic layout. Users add/edit blocks; the preset arranges them. No freeform canvas.
- **Consistency is the readability feature.** The same block type always looks the same everywhere (every decision is a yellow diamond, every outcome a green pill), so any teammate reads any diagram instantly.
- **A diagram is structured data, not a picture.** One JSON document is the single source of truth, rendered two ways: visual diagram and accessible narrative outline. They cannot drift because they share a source.
- **Customize within the preset, not out of it.** Editing text, adding/deleting/reordering blocks, retargeting connections, recategorizing, swapping a block's type — all first-class. Freeform positioning, freehand shapes, per-diagram theming — explicitly out of scope for v1.
- **Accessibility is first-class.** Every preset declares a narration order and template; the accessible view is a real semantic outline, never a degraded export.

## Architecture

Four pieces, each with one job:

| Piece | Tech | Responsibility |
|---|---|---|
| **Editor** | React + Vite + TypeScript, React Flow canvas | Render diagrams from JSON; add/edit/delete/reorder/retarget/swap blocks; toggle visual ↔ accessible view; export. Works fully against a local document; network only for save/load and AI. |
| **AI drafting service** | Vercel serverless function | Receives pasted text + chosen preset, calls Claude API, returns a knowflow JSON document. Server-side so the API key never reaches the browser. Stateless. |
| **Library + auth** | Supabase (US region): Postgres + Auth | Stored diagrams, version history, draft/official status, team login. Row-level security: only signed-in team members read/write. |
| **Document format** | JSON (the spine) | Single source of truth. Visual diagram, accessible outline, saved record, and AI output are all this one shape. |

**Headline data flow:** paste text → editor → AI service → JSON → editor renders & user refines → save to library as draft → team lead approves → becomes official version.

**Hosting:** Vercel (US), behind the Supabase team login. Not publicly exposed; reachable from district wi-fi; no blockable content. Free tiers expected to cover a small team.

## Document format

A knowflow diagram is one JSON object:

```jsonc
{
  "id": "uuid",
  "title": "Handling disabled accounts",
  "preset": "flowchart",          // flowchart | decisionTree | fishbone | stepList
  "blocks": [
    { "id": "b1", "type": "step", "text": "Ticket arrives" }
    // preset-specific fields as needed (e.g. fishbone cause: { categoryId })
  ],
  "connections": [
    { "id": "c1", "from": "b1", "to": "b2", "label": "yes" }
  ],
  "meta": {
    "author": "user-id",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601",
    "status": "draft",            // draft | official
    "version": 1
  }
}
```

The preset is both validator and layout authority — illegal shapes (a fishbone with two spines, a step pointing nowhere) cannot be created, which keeps every diagram readable and the accessible view reliable.

### Preset vocabularies

| Preset | Block types | Connection rules | Shape |
|---|---|---|---|
| **Flowchart** | `step`, `decision`, `outcome` | Directed connections; decisions carry labeled branches (e.g. yes/no) | Directed graph |
| **Decision tree** | `question`, `outcome` | Branches with answer labels | Tree |
| **Fishbone (Ishikawa)** | `spine` (exactly one), `category` (ribs), `cause` (attached to a category) | Attachment-based, not free arrows | Spine + ribs |
| **Step list** | `step`, `note`, `warning` | Order is the sequence; minimal/no branching | Linear |

Layout: standard layout engines for flowchart/tree shapes; a small custom layout for fishbone (geometrically simple); ordered stack for step list.

## Screens

1. **Library (home)** — grid/list of diagrams with title, preset, and status badge (Official / Draft). Filter by status. "New diagram" button. Official is always unambiguous — the cure for version drift.
2. **Create flow** — pick a preset, then *paste text* (AI drafts) or *start blank*. Importing a knowflow JSON also lands here.
3. **Editor** — center canvas (React Flow); block palette for the chosen preset; inspector panel to edit the selected block's text/type; toolbar for view-toggle, save, export. (Visual mockup to be produced before building this screen.)
4. **Accessible view** — the same diagram as a structured, navigable semantic outline. Toggle from the editor; default for screen-reader users.
5. **Review/approval (team lead)** — list drafts, open one, "Make Official" (version-stamps it; demotes prior official to history).

## Accessibility behavior

Every preset declares a **narration order** and a **narration template**, rendering the JSON to a semantic outline (headings, ordered lists, plain-language relationships):

- **Flowchart / decision tree:** "Step 3 of 7: Check whether the account is locked. This is a decision. If yes → go to step 4, Unlock account. If no → go to step 6, Reset password."
- **Fishbone:** "Effect: Account stays disabled. Cause category 1 of 4: Students. Causes: (1) … (2) …"
- **Step list:** ordered list; notes and warnings announced as such.

Baselines (carried from the helpdesk-qol accessibility standard):
- Full keyboard navigation of the canvas (tab/arrow between blocks; edit without a mouse).
- Strong, high-contrast focus rings that survive heavy browser zoom.
- No hover-only interactions.
- ARIA correctness from real semantic elements, not hand-rolled.

The accessible view is generated from the same source as the diagram, so it can never drift — and for some processes it is clearer than the diagram.

## Build slices

Each slice ends in a demonstrable, useful artifact.

- **Slice 1 — Editor, local-only.** Document format + all four presets + React Flow canvas + edit-within-preset (add/delete/reorder/edit text/retarget connection/recategorize/swap type) + accessible view + export (PNG/PDF) + import/export JSON. Saves to browser storage. *Usable on its own* — can pilot via emailed JSON files ("share by export" fallback). Bulk of the value and the work.
- **Slice 2 — AI drafting.** Serverless Claude function + paste-to-draft create flow. Slots into the existing editor; everything downstream already works.
- **Slice 3 — Shared library + approval.** Supabase auth, stored diagrams, draft/official status, version history, team-lead approval. The `status`/`version` fields exist from Slice 1, so this is addition, not rework.

If the timeline tightens, Slice 3 lands last with the least disruption.

## Out of scope for v1

Conscious boundaries, each additive later if pilot demand appears — none requires a rewrite:

- Freeform drag-to-position; freehand shapes/connectors
- Per-diagram custom themes/fonts
- Mixing presets on one canvas
- Automatic KB syncing (only explicitly pasted text reaches the AI)
- Real-time multi-user co-editing
- A 5th preset (comparison matrix is the likely first add later; hierarchy/escalation and timeline are candidates after)

## Open items to resolve during planning

- Exact auth model (Supabase email invite vs. shared team credential) — approval flow needs identifiable authors.
- Export library choice for PNG/PDF (canvas-to-image vs. SVG export).
- React Flow auto-layout integration specifics per preset (which layout engine; fishbone custom layout).
- Browser storage mechanism for Slice 1 (localStorage vs. IndexedDB) given diagram size.

## Security / privacy notes

- Repo is **private** (references internal district processes). Real KB content stays out of the repo regardless — sample/seed data only.
- AI receives only text the user explicitly pastes; no automatic syncing of the KB.
- Claude API (US, does not train on API data); app US-hosted behind login.
