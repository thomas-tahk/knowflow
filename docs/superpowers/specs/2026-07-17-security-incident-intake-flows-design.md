# Security Incident Intake Flows — Design

**Date:** 2026-07-17
**Status:** In progress (build → localhost review → iterate → deploy)
**Branch:** `sec-intake-flows`

## Context

The Service Desk supervisor started mapping the team's cybersecurity ticket
intake process (8 hand-drawn diagrams + a text write-up, all marked "incomplete"
— work-in-progress the supervisor didn't finish). The goal is to turn that into a
navigable **series of linked knowflow starter flows** the team can actually use,
and to show the supervisor where the app can go for security-ticket intake.

Source material lives in `~/Downloads/resourcescontexttofeed/` (8 PNGs + one
`Security Incidents text.docx`). This spec is the design of record; the flows are
bundled as read-only `starter:` flows, exactly like the existing APS flows.

## Decisions (locked with the user)

| Decision | Choice | Rationale |
|---|---|---|
| **Scope** | Service-Desk-centric | knowflow is an SD tool; SD is the protagonist. Other teams appear as tagged handoffs. |
| **Entry routing** | By **symptom** (what's reported) | Natural for an analyst on a call; origination becomes context. (Source text is origination-first; sub-flow diagrams are symptom-first — symptom won.) |
| **Delivery** | Bundle as read-only `starter:` flows | Polished + permanent, like the 4 existing APS starters. Requires code + Vercel deploy to go live. |
| **Presets** | Router + sub-flows = `flowchart`; remediation = `stepList`; ownership map = `fishbone` | `flowchart`/`decisionTree` render identically (both `graphEdges`); `flowchart` matches all 4 existing starters (zero risk). |
| **Reuse** | `linkTo` doors into existing `starter:reset-password` / `starter:verification` | The "series of flows" web doing real work — no restating the reset procedure. |
| **KB references** | Dropped | Per user: KB numbers are not the diagrams' concern. |
| **Team framing** | Light `Team:` tags on non-SD actions only | Per user, for these incidents the other teams are "in the same chair" — collaborative, not hard escalations. |
| **MDR vs Compromised** | Merged into one flow | Per user: MDR (Sophos) is how the ticket arrives — InfoSec notices, creates the INC, tasks SD with the reset. |

## Flow inventory

**Entry (1):** `starter:sec-intake` (flowchart) — a `decision` hub routing by symptom
to each sub-flow.

**Sub-flows (7, flowchart, SD-centric):**
1. `starter:sec-phishing` — direct user to the KnowBe4 phish hook (minimal; CASA sub-types to be specified).
2. `starter:sec-hacked-email` — verify → reset PW → remediation.
3. `starter:sec-malware` — malware / virus / browser-takeover / fake-help-desk → PW reset → InfoSec Sophos scan.
4. `starter:sec-compromised-account` — InfoSec MDR/Sophos alert (or customer-suspected) → notify → reset → remediation.
5. `starter:sec-google-suspension` — CASA/Google auto-suspension → notify → reset.
6. `starter:sec-lets-talk` — "Let's Talk" security concern → open INC in ServiceNow.
7. `starter:sec-darkweb-password` — InfoSec darkweb/state-federal alert → confirm legit → reset (SD minimally involved).

**Reference (2):**
8. `starter:sec-remediation` (stepList) — the ordered remediation checklist (1a → 1b → 2 → 3 → 4).
9. `starter:sec-ownership-map` (fishbone) — the supervisor's "triangle" as a team-ownership diagram.

**Reused (not new):** `starter:reset-password`, `starter:verification`.

## Link graph

- `sec-intake` → doors → all 7 sub-flows + `reset-password` (plain login issue).
- Every "reset password" step → door → `reset-password` (which itself chains to `verification`).
- `sec-hacked-email`, `sec-compromised-account` → door → `sec-remediation`.
- `sec-remediation` step 1a → door → `reset-password`.

## Open questions for the supervisor (embedded as flow notes)

These are process/policy items the team owns — **not** invented here. Answers from
the user's review so far are noted; remaining unknowns are flagged in the flows.

1. ~~Do remediation steps 1a→4 always run, in order?~~ **Answered: yes, always, in order.**
2. ~~Is SD-centric the right scope?~~ **Answered: yes.**
3. **CASA phishing sub-types** (bad-guy phish vs training-hook abuse vs spam vs Google-report) —
   simplified for now; does SD need to distinguish them, or is that internal to CASA? *(open)*
4. ~~Are Compromised Accounts and MDR the same?~~ **Answered: yes — MDR is the arrival path.**
5. ~~KB references current?~~ **Answered: out of scope for the diagrams.**
6. ~~"Tech Oasis" / "TCS" labels?~~ **Answered: correct; those teams are peers here.**
7. ~~SD's role in darkweb/state-federal tickets?~~ **Answered: minimal — confirm legit + reset.**

## Build & iterate plan

1. Author all 9 flowchart/stepList flows + register + update the starter test. → verify: `npm test`, `npm run build`.
2. Add the fishbone ownership map once the core renders. → verify: renders in the Diagrams panel.
3. Run localhost; iterate on representation with the user as many rounds as needed.
4. Only after the user is satisfied: push the branch and open a draft PR (Vercel deploy).

## Final state (after review iteration)

The design above is the starting point; it evolved through review with the Service Desk. Final shipped set:

**Router (`starter:sec-intake`)** — 5 symptom branches: Phishing · Malware / Virus / Takeover · Compromised Account or Device · Darkweb Alert · Let's Talk. (Removed "can't log in / password" — not a security incident unless an admin suspension is involved.)

**Sub-flows:**
- `sec-phishing` — phish hook; falls back to KB0017446 if it asks for a registration key.
- `sec-malware` — reset → Security Tasks → "Account/Device secured and restored".
- `sec-compromised-account` — merged **Google/CASA suspension** and **Hacked Email** into this as arrival channels (CASA flag / InfoSec-MDR ticket / customer call). Notify is best-effort ("often you can't reach them"). → reset → Security Tasks.
- `sec-darkweb-password` — confirm legit → reset → "IT's involvement is complete".
- `sec-lets-talk` — includes the bad-actor rationale for requiring a ticket/call.

**Reference:** `sec-remediation` (renamed **Security Tasks**), `sec-ownership-map` (fishbone).

**Removed during review:** standalone `sec-hacked-email` and `sec-google-suspension` (merged into Compromised).

**Door naming:** every link-out node uses the target flow's canonical name (`Reset Password`, `Security Tasks`, etc.).

### Beyond the flows (same PR)
- **Fishbone renderer fix** (`fishboneSvgLayout.ts`): causes now stack by real cumulative height with ribs that grow to fit, so labels never overlap (was crammed into a fixed 150px rib). Made the layout linear (single-pass group-by). Locked with a no-overlap regression test.
- **`Disabled Account` fishbone** — recreated (skeleton) from the team's PDF; validates the renderer on real, varied content and kept as a flow.
- **Diagrams panel fix** — one scroll region below the buttons so the "Team flows" group can't be clipped.

### Flows-list grouping (shipped — separate PR off merged `main`)
The starter list grew to 13 flows in two natural topics, so the Diagrams panel now
groups them with collapse/expand.

| Decision | Choice |
|---|---|
| **Groups** | Two topic headers replacing the single "Starter flows" header: **Account & Access** (Disabled Account, set-no-2FA-OU, 2FA, reset-password, verification) and **Security Incident Intake** (the `sec-*` flows). Disabled Account lives under Account & Access — it's an account-state issue, not an incident. Team flows stays its own group below. |
| **Source of grouping** | An ordered `STARTER_GROUPS` registry in `starterFlows.ts` (`{ title, defaultCollapsed?, flows[] }`); `STARTER_FLOWS` is derived via `flatMap`, so `resolveFlow` is unchanged. Grouping metadata lives with registration — one source of truth for order + topic. The panel renders starters strictly in **registry order** (via a `STARTER_ORDER` index), independent of the `updatedAt` sort `EditorScreen` applies for Team flows — so display order is fully controlled by the registry and never scrambled by per-flow timestamps. |
| **Default state** | All groups expanded except **Security Incident Intake** (collapsed by default, `defaultCollapsed: true`) to keep the list short. Session-only React state — no persistence. |
| **Scope** | Every group header is collapsible via one `CollapsibleGroup` component (topics + Team flows), `<button aria-expanded>` with chevron + count. |

`FlowSummary` gains `group?: string` (topic title for starters; `undefined` = Team flows);
`listFlows` stamps each starter with its group. Locked with a test asserting the two
titles partition all starters with no orphans.

### Still open (follow-up)
- **Disabled Account editable — its own PR.** Starters are intentionally viewable by
  everyone (bundled, no backend), so Disabled Account stays a starter for now.
  Direction for that PR: a **read-only ↔ editable toggle** (guarded by an "are you
  sure?" confirm) that forks the bundled starter into an editable library copy on
  demand — keeping the canonical starter as the always-viewable version while allowing
  edits. This generalizes the earlier "fork-to-edit for starter flows" item.
- Ownership map could map the Security Tasks onto owning teams more fully.
- fishbone model can't carry colors, on-rib team labels, side legends, or annotation arrows (the Disabled Account original uses all of these).
