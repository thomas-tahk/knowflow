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

## ← START HERE ON RESUME: node diction

User reviewed the rendered flows and the verdict is **the node text is too verbose**. The
content and paths are broadly right; the wording is not. Next session is a pass over
**each node individually**, tightening text toward labels rather than sentences.

Worst offenders (mine, written this pass):
- `secMalware` triggers — each carries a full P1 conditional clause inside the box
- `secDarkwebPassword` Google branch — `dw-google-react`, `dw-google-direct`, `dw-google-task`
  are all full sentences
- `secCompromisedAccount` `ca-notify` — parenthetical inside a conditional
- `secRemediation` — the numbered steps carry their entire procedure inline

Constraint that should drive this: these diagrams become **KB reference documents and
screenshots** for the department. Box text has to be scannable at a glance. Detail that
doesn't fit belongs in the flow `description`, not in a node.

Go node by node; do not restructure paths while doing diction.

## Next steps

1. **User has not yet visually reviewed any of this.** They review in the running app, not
   from prose — `npm run dev` in the worktree, no `.env.local` needed (falls back to bundled
   starters, so no database involved). Diagrams panel → "Security Incident Intake" group
   (collapsed by default).
2. Interpretations to confirm on screen:
   - Darkweb Google branch ordering: reactions → direct-to-change-password → InfoSec/CASA task → Reset
   - Malware: "Create a P1" sits on the main line for *all* paths, per the amended step wording,
     even though only fake-helpdesk is unconditionally P1
   - Security Tasks as a flowchart loses the clean numbered-list look — check it still reads well
3. **Parked feature:** team color-coding. User wants *background color columns* (swimlanes) —
   4 teams, 3 primary. `Block` has no color field; flowchart preset allows only
   step/decision/outcome. Agreed to bench until text/path/node edits are done.

## Open questions

- Whether "the different flow paths are not mutually exclusive" (raw notes) needs structural
  work anywhere — not yet addressed.
- The user raised doing edits **in the app** instead of in the repo, to dogfood the editor and
  persist via Supabase. Note the conflict: `scripts/seedFlows.ts` re-seeding overwrites in-app
  edits and requires `--force` once rows exist. Undecided.
- User mentioned "other app-wide design considerations" to raise immediately after this.

## Shipping

Content lives in the repo; reaching production needs `npm run seed:flows --force`, which
discards any in-app edits. Nothing has been seeded or deployed.
