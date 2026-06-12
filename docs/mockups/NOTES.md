# Mockups & prototype — notes

Throwaway artifacts for validating look and feel before implementation. Not production code.

## Files

- **editor.html** — static visual mockup of the editor (refined-utility aesthetic: ivory paper, teal accent, semantic diagram palette, Fraunces + Hanken Grotesk). Establishes the visual language.
- **editor-prototype.html** — interactive throwaway prototype (vanilla JS, in-memory, no persistence). Open directly in a browser.

## Question the prototype answers

> Does the editor *feel* right to use — selecting, editing, adding, moving blocks — and does the Visual ⇄ Accessible duality read as valuable?

### What it demonstrates
- Click to select a block → inspector populates
- Live label editing (node text + accessible narration update in real time)
- Change block type (restyles in place)
- Add block from palette (auto-links from the selected block)
- Drag blocks freely; connectors re-route live
- Delete blocks and individual connections
- **Visual ⇄ Accessible toggle** — the same in-memory document rendered as a diagram OR a semantic outline

### Deliberate simplifications (vs. the real app)
- Free drag positioning; the real app uses **React Flow + auto-layout** (no hand-placing)
- Narration order = node creation order; real app will topologically sort
- No edge-drawing UI, no undo, no persistence
- Single preset (flowchart) only

## Verdict
_TBD — fill in after the user plays with it._

## Disposition
Delete or fold validated decisions into the real implementation once the editor is scaffolded. Do not let these rot in the repo.
