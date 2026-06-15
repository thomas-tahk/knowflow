import type { Preset } from '../core/types';

const GUIDANCE: Record<Preset, string> = {
  flowchart:
    "Build a FLOWCHART. Use 'step' for actions, 'decision' for yes/no branch points, and 'outcome' for terminal results. " +
    "Link blocks with connections; label the edges leaving a decision (e.g. \"Yes\"/\"No\"). Ensure a single clear starting block.",
  decisionTree:
    "Build a DECISION TREE. Use 'question' nodes that branch to other questions or to 'outcome' leaves. " +
    "Label every connection with the answer that leads down that branch.",
  stepList:
    "Build a STEP LIST. Use ordered 'step' blocks in the sequence they should be performed; use 'note' for tips and 'warning' for cautions. " +
    "The order of blocks IS the sequence — you do not need connections.",
  fishbone:
    "Build a FISHBONE (Ishikawa) diagram. Provide exactly one 'spine' block stating the effect/problem, several 'category' blocks for the " +
    "major cause groups, and 'cause' blocks that each reference their category via the \"category\" key. Do not use connections.",
};

export function presetGuidance(preset: Preset): string {
  return (
    "You turn source material (notes, knowledge-base text, or an image of text or a hand-drawn sketch) " +
    "into ONE clear diagram for an IT service-desk team. Respond ONLY by calling the emit_diagram tool — no prose. " +
    "Keep labels short and concrete. Stay faithful to the source; if it is thin, produce a sensible minimal skeleton rather than inventing detail.\n\n" +
    GUIDANCE[preset]
  );
}
