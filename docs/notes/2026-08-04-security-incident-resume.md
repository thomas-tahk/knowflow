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

Rule applied: box text is a label, not a sentence. Detail that no longer fits moved into
the flow `description` — nothing was dropped. Driving constraint: these diagrams become
**KB reference documents and screenshots**, so boxes must be scannable at a glance.

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
