# Security-incident content corrections — resume note

**Branch:** `fix/sec-incident-content` · **Worktree:** `.claude/worktrees/sec-content-fix`
**Source of truth:** `docs/notes/2026-08-04-security-incident-raw-notes.txt`
(extracted from `~/Downloads/Security Incidents flows edits needed.docx`)

## Critical context

An earlier attempt used a **different, AI-edited file** (`Security-Incidents-text.md`) that
turned out to be largely fabricated — it invented a Service Desk / CASA / InfoSec origination
taxonomy that is not in the real notes. **All work derived from it was reverted.** Do not use
that file. The raw notes are *edits to existing diagrams*, not source material for new ones.

## Done (committed, verified)

Typecheck clean · 128/128 tests · all 13 starter flows validate against their presets.

| Flow | Change |
|---|---|
| `secLetsTalk` | Removed the INC-creation step and the outcome box; ends on "Direct the user to call the Service Desk" |
| `secCompromisedAccount` | Notify node → "if a phone number is available (check AD or ServiceNow)"; customer-called-in (leftmost) now routes straight to Reset Password, skipping notify |
| `secRemediation` | "instructs" → "relays"; step 3 → Server Ops request; **converted stepList → flowchart** so step 3 fans into CASA/InfoSec boxes converging on Server Ops |
| `secDarkwebPassword` | Split into two originations: InfoSec alert, and a Google notification branch (user reactions → direct customer to change password → InfoSec/CASA creates SD task) |
| `secMalware` | P1 criteria noted on trigger nodes (fake helpdesk = always; VIP; systemic); added "Create a P1 — follow KB0017485" between Reset Password and Security Tasks |

Untouched: `secIntake`, `secPhishing`, `secOwnershipMap`, and all non-security flows.

## Node diction — DONE 2026-08-05 (commit `182164c`), needs on-screen review

Verdict was **the node text is too verbose**; content and paths were broadly right. A
node-by-node pass tightened every box toward a label. No path or structure changed.
Typecheck clean · 128/128 tests.

**Two rules, and the second one supersedes how the first pass was executed:**

1. Box text is a label, not a sentence. These diagrams become **KB reference documents and
   screenshots**, so boxes must be scannable at a glance.
2. A `description` is **one short line (~90 chars) saying what the flow is** — *not* an
   overflow bucket. The first pass assumed it was one; it isn't. See "Description is
   single-line" below. Detail therefore either fits in a node, rides an arrow as a
   connection `label`, or is cut on purpose.

### Description is single-line — verified, not assumed

- Editor: a single-line `<input>` in the topbar, 12px, fixed 520px (`EditorScreen.tsx:281`,
  `EditorScreen.css:24`). Past ~90 chars it is simply not visible.
- **PNG/PDF export** (the KB screenshot): one `ctx.fillText()`, centered, **no wrapping and
  no clipping** (`exporters.ts:120-124`). A long description runs off both edges of the
  image and is cut by the canvas bounds.
- Open option, user's call, not started: word-wrap the header in `composeWithHeader` and
  make the editor field wrap. ~30 lines, outside this content branch's scope.

### Review round 2026-08-05/06 — user reviewed on screen, flows revised

Went past diction into structure. Every flow below is at ≤95-char description.

| Flow | Revision |
|---|---|
| `secLetsTalk` | Down to **2 nodes** (`lt-why` deleted). The reasoning rides the arrow as a connection label. Note `.ge-label` is `white-space: nowrap` (`GraphEdge.css:7`) — long labels render as one wide pill |
| `secCompromisedAccount` | Description is the user's verbatim text. `ca-notify` regained "in AD or ServiceNow". **Dropped deliberately:** CASA "manually or automatically", MDR "AD account or device" |
| `secDarkwebPassword` | **Rebuilt.** InfoSec and CASA are two originations that *converge* on confirm → reset → done. The three Google-side steps deleted as clutter |
| `secMalware` | **Rebuilt.** P1 conditional is now a decision diamond (`mw-isp1`) instead of text repeated in two triggers; Yes → create P1, No → straight to Security Tasks |
| `secRemediation` | Description trimmed to one line; `rm-1b` regained "user action or Google Admin" so the mechanics survive in the node |
| `secPhishing` | Description trimmed. The "further CASA-side sub-types to be specified with supervisor" line was removed from it — **that to-do now lives here** (see Open questions) |

**Principle the user set:** the raw notes are *their own* notes, not the supervisor's. Content
in them is not gospel — cutting clutter to make the diagram readable is the job, not a
deviation from source.

### The original 2026-08-05 diction pass (superseded in places by the above)

| Flow | Diction change |
|---|---|
| `secMalware` | Triggers → `Malware or virus reported (P1 if VIP or systemic)`, `Browser takeover reported (…)`, `Fake help desk pop-up — always P1`. The fake-1-800 explanation and the KB title moved to the description; the short P1 qualifier stayed **in** the boxes on purpose — it's the decision the reader is scanning for |
| `secDarkwebPassword` | Google branch is four short labels now; "customer may not even be aware of the notification" → description |
| `secCompromisedAccount` | Origination boxes → `CASA flag — …` / `InfoSec ticket — …` / `Customer called in — …`; `ca-notify` → `Notify the user if a phone number is listed` (AD/ServiceNow lookup → description) |
| `secRemediation` | Numbered steps carry the action + owning team only; the sign-out mechanics, inbox checklist, and TCS re-image detail → description. `rm-3-so` reads `Server Ops resets the Azure tokens` |
| `secLetsTalk` | `lt-why` → `Verify the real user by ticket or call`; the bad-actor reasoning → description |
| `secPhishing` | **Not in the original scope** — same sentence-length problem, so it got the pass too (`Customer reports phishing`, `Provide the registration key (KB0017446)`, …). Bumped to version 2 |

Untouched: `secIntake` and `secOwnershipMap` were already label-length.

## ← START HERE ON RESUME

1. **User has still not visually reviewed any of this.** They review in the running app, not
   from prose — `npm run dev` in the worktree, no `.env.local` needed (falls back to bundled
   starters, so no database involved). Diagrams panel → "Security Incident Intake" group
   (collapsed by default). Shorter labels also mean **smaller boxes and a different layout**
   than the last render — check the whole group re-lays out sensibly, not just the wording.
2. Things to confirm on screen after the 2026-08-06 revisions:
   - `secLetsTalk`: does the long nowrap edge label read as an annotation or as a banner?
     Fallback if it's too much: "A ticket or call verifies the real user"
   - `secDarkwebPassword`: do the two originations now sit on one row (the vertical offset was
     a symptom of the four-node branch, not a layout setting)?
   - `secMalware`: does the new `P1?` diamond + Yes/No rejoin read cleanly?
   - Security Tasks as a flowchart loses the clean numbered-list look — check it still reads well
3. **Parked feature:** team color-coding. User wants *background color columns* (swimlanes) —
   4 teams, 3 primary. `Block` has no color field; flowchart preset allows only
   step/decision/outcome. Agreed to bench until text/path/node edits are done.

## Open questions

- **Phishing sub-types** — further CASA-side sub-types (bad-guy phish, training-hook abuse,
  spam) still to be specified with the supervisor. Moved here out of the flow description.
- Whether "the different flow paths are not mutually exclusive" (raw notes) needs structural
  work anywhere — not yet addressed.
- The user raised doing edits **in the app** instead of in the repo, to dogfood the editor and
  persist via Supabase. Note the conflict: `scripts/seedFlows.ts` re-seeding overwrites in-app
  edits and requires `--force` once rows exist. Undecided.
- User mentioned "other app-wide design considerations" to raise immediately after this.

## Shipping

Content lives in the repo; reaching production needs `npm run seed:flows --force`, which
discards any in-app edits. Nothing has been seeded or deployed.
