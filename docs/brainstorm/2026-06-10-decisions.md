# knowflow — Brainstorm Decisions (2026-06-10)

Status: brainstorming in progress. This captures what's decided so far; the full design spec comes after open questions close.

## Origin / problem

- Team lead repeatedly prints new versions of a fishbone diagram (handling disabled accounts per user type in the district) — version drift on paper.
- Wish: turn a body of text (personal notes, KB articles) into readable visual aids without learning Visio/graphics apps.
- Want fast creation from presets, and easy iteration on previous diagrams (re-open and edit, not redraw).

## What it is

A web app for the service desk team: paste text (KB article or notes) → AI drafts a diagram into a chosen preset → user refines in a structured editor → share with the team. Diagrams are living documents, not pictures.

## Decisions

| Topic | Decision |
|---|---|
| Name | **knowflow** (knowledge → flow) |
| Core interaction | AI text-to-diagram is the main event; only text the user explicitly pastes is sent to the AI (Claude API). No automatic KB syncing. |
| Diagram model | Every diagram is structured data (nodes/connections/preset), not a drawing. Enables editing, versioning, and dual rendering. |
| Accessibility | First-class requirement. Every preset renders two ways: visual diagram AND a screen-reader-friendly narrative view (structured outline: "Step 3 of 7: … If yes, go to step 4"). Motivated by a partially-blind teammate using read-aloud software. |
| Presets | Candidates: flowchart, decision tree, fishbone, swimlane, visual step list. Selection of v1 set + daily drivers: **pending**. |
| Team model | Shared team library. Anyone creates/edits drafts (visible to all); a single approver role (team lead) promotes drafts to the official version. Roles-lite: members + approver flag. |
| Versioning | History retained; exactly one official current version per process. |
| Hosting | External cloud (internal hosting rejected — no always-on machine available). Must be US-hosted, reachable from district wi-fi, behind a team login (not publicly exposed). |
| Build order | Slice 1: editor + presets + AI drafting + accessible view + export. Slice 2: shared library + drafts/approval. Data model supports approval states from day one. |
| Repo | Private (references internal district processes). |

## Open questions

- Which presets make v1, and which 1–2 are the daily drivers (browser question pending).
- Tech stack (lean toward familiar: React/Vite/TS; backend/auth/storage TBD — Supabase a candidate, US region).
- Auth approach (lightweight team login vs. per-user accounts; approval flow needs identity).
- Import sources beyond paste (file upload? existing diagram import?).
- Export formats (PNG/PDF for printing/embedding into KB articles).
- Team size / scale assumptions (small team assumed).

## Timeline goal

Usable by the team within a few weeks of 2026-06-10.
