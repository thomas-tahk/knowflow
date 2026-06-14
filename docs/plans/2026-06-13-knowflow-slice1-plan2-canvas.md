# knowflow Slice 1 — Plan 2: Canvas & Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render any knowflow document (from the Plan 1 core) as a polished, read-only diagram for all four presets, using a pure layout engine plus React Flow.

**Architecture:** A pure `layout` layer computes `{ blockId → {x,y} }` per preset (Dagre for flowchart/decision-tree; simple math for step-list and fishbone). A pure `adapter` converts a `KnowflowDoc` + positions into React Flow `nodes`/`edges` (synthesizing rib edges for fishbone and sequence edges for step-list). A single custom node component renders every block type by its visual shape. A `DiagramCanvas` React component wires it into a read-only `<ReactFlow>`. A dev harness (`App.tsx`) lets you pick a preset and see a seeded sample rendered.

**Tech Stack:** React 19 + Vite + TypeScript, `@xyflow/react` v12, `@dagrejs/dagre`, Vitest. Builds on `src/core/` from Plan 1 (Plan: `docs/plans/2026-06-12-knowflow-slice1-foundation.md`).

**Verified library facts (from official docs, 2026-06-13):**
- Package `@xyflow/react` (v12.11.0); **must** `import '@xyflow/react/dist/style.css'`; React 18/19 both satisfy peers.
- `nodeTypes`/`edgeTypes` must be defined **outside** the component (or `useMemo`) or React Flow warns and re-creates them.
- Every node needs an explicit `position: {x,y}`. Dagre `g.node(id)` returns the node **center**; React Flow positions by **top-left**, so subtract half width/height.
- Arrowheads: `markerEnd: { type: MarkerType.ArrowClosed }` imported from `@xyflow/react`.
- Read-only config: `nodesDraggable={false} nodesConnectable={false} elementsSelectable={true}`; selection via `onSelectionChange`.
- `fitView` comes from `useReactFlow()` and must run inside `<ReactFlowProvider>`; call it in an effect after positions change (not the same tick as `setNodes`).

**This is Plan 2 of 4 for Slice 1.** Plan 1 = document core (done). Plan 3 = editing UI (palette + inspector wired to operations + autosave). Plan 4 = accessible narrative view + PNG/PDF/JSON export.

---

## Design decisions locked for this plan

- **All four presets render in React Flow** (one canvas, one selection model — keeps Plan 3's editing uniform). Fishbone is modeled in the core via `categoryId` attachment with an empty `connections` array; for *rendering only*, the adapter synthesizes **diagonal rib edges** (cause→category, category→spine) drawn with a custom **floating straight edge** so the bones slant like a real Ishikawa diagram. This is iteration zero of the fishbone look — bones converge diagonally on the effect box. A later iteration can add synthetic spine-joint nodes so bones meet a horizontal spine line at distinct points, and Plan 3 may add drag-with-snap; both are noted as future polish, not built here.
- **Layout is pure and separate from React.** `layoutDoc(doc)` returns positions; the canvas just consumes them. This keeps layout unit-testable with zero DOM.
- **One node component, four shapes.** `KnowflowNode` switches shape (rect / diamond / pill) by block type using a shared style table, and exposes four handles (`t` target, `b` source, `l` target, `r` source) so the adapter can attach edges directionally per preset.
- **Read-only this plan.** No editing yet; the canvas renders and allows selection (selection is surfaced but unused until Plan 3).
- **Fixed node sizes per shape** (so Dagre layout matches rendered size). Defined once in `blockStyles.ts` and used by both layout and rendering.

## File Structure

- `src/layout/sizes.ts` — fixed node dimensions per visual shape (shared by layout + render).
- `src/layout/graphLayout.ts` — Dagre layout for flowchart + decision-tree.
- `src/layout/linearLayout.ts` — vertical-stack layout for step-list.
- `src/layout/fishboneLayout.ts` — spine + alternating categories + stacked causes.
- `src/layout/index.ts` — `layoutDoc(doc)` dispatcher by preset; returns `Positions`.
- `src/canvas/adapter.ts` — `toReactFlow(doc, positions)` → `{ nodes, edges }` (pure).
- `src/canvas/floatingEdge.ts` — `getEdgeParams(source, target)` border-intersection helper (pure) for diagonal fishbone bones.
- `src/canvas/FloatingEdge.tsx` — custom React Flow edge drawing a straight line between node borders (the diagonal rib).
- `src/canvas/blockStyles.ts` — block-type → `{ shape, bg, border, ink, size }` style table.
- `src/canvas/KnowflowNode.tsx` — custom node component (rect/diamond/pill + 4 handles).
- `src/canvas/DiagramCanvas.tsx` — `<ReactFlow>` wrapper (read-only, fitView, Background, Controls).
- `src/canvas/samples.ts` — seeded sample docs per preset for the dev harness + tests.
- `src/App.tsx` — replace Vite default with a preset-switcher harness rendering `DiagramCanvas`.
- `src/index.css` / component CSS — minimal styling consistent with the approved mockup palette.

---

## Task 1: Install dependencies and node sizes

**Files:**
- Modify: `package.json` (deps)
- Create: `src/layout/sizes.ts`
- Test: `src/layout/sizes.test.ts`

- [ ] **Step 1: Install React Flow and Dagre**

Run:
```bash
cd /Users/tnt/Projects/knowflow
npm install @xyflow/react @dagrejs/dagre
```
Expected: both added to `dependencies`. (React 19 satisfies peers; no `--legacy-peer-deps` needed.)

- [ ] **Step 2: Write the failing test**

```ts
// src/layout/sizes.test.ts
import { describe, it, expect } from 'vitest';
import { sizeForShape, type Shape } from './sizes';

describe('node sizes', () => {
  it('returns positive width/height for every shape', () => {
    const shapes: Shape[] = ['rect', 'diamond', 'pill'];
    for (const s of shapes) {
      const { width, height } = sizeForShape(s);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    }
  });

  it('makes diamonds square (equal width and height)', () => {
    const d = sizeForShape('diamond');
    expect(d.width).toBe(d.height);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './sizes'`.

- [ ] **Step 4: Write the implementation**

```ts
// src/layout/sizes.ts
export type Shape = 'rect' | 'diamond' | 'pill';

export interface Size { width: number; height: number; }

const SIZES: Record<Shape, Size> = {
  rect: { width: 180, height: 56 },
  diamond: { width: 130, height: 130 },
  pill: { width: 170, height: 52 },
};

export function sizeForShape(shape: Shape): Size {
  return SIZES[shape];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/layout/sizes.ts src/layout/sizes.test.ts
git commit -m "chore: add React Flow + Dagre; define node sizes"
```

---

## Task 2: Block style table

**Files:**
- Create: `src/canvas/blockStyles.ts`
- Test: `src/canvas/blockStyles.test.ts`

Maps every `BlockType` to its visual treatment (shape + colors), reusing the approved mockup palette. Shape drives both layout size and rendering, so this is the single source of visual truth.

- [ ] **Step 1: Write the failing test**

```ts
// src/canvas/blockStyles.test.ts
import { describe, it, expect } from 'vitest';
import { styleFor } from './blockStyles';
import { ALL_BLOCK_TYPES } from '../core/types';

describe('block styles', () => {
  it('has a style for every block type', () => {
    for (const t of ALL_BLOCK_TYPES) {
      const s = styleFor(t);
      expect(s.shape).toMatch(/^(rect|diamond|pill)$/);
      expect(s.bg).toMatch(/^#/);
    }
  });

  it('uses diamond for decisions and questions, pill for outcomes', () => {
    expect(styleFor('decision').shape).toBe('diamond');
    expect(styleFor('question').shape).toBe('diamond');
    expect(styleFor('outcome').shape).toBe('pill');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './blockStyles'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/canvas/blockStyles.ts
import type { BlockType } from '../core/types';
import type { Shape } from '../layout/sizes';

export interface BlockStyle {
  shape: Shape;
  bg: string;
  border: string;
  ink: string;
}

const STEP: BlockStyle    = { shape: 'rect',    bg: '#E7EDF5', border: '#9DB4D0', ink: '#2E435C' };
const DECISION: BlockStyle = { shape: 'diamond', bg: '#F8EFD6', border: '#D9B968', ink: '#6A4E14' };
const OUTCOME: BlockStyle  = { shape: 'pill',    bg: '#E5F0E7', border: '#92BC9B', ink: '#2F5236' };
const SPINE: BlockStyle    = { shape: 'rect',    bg: '#E4EFEC', border: '#0F766E', ink: '#0B5D56' };
const CATEGORY: BlockStyle = { shape: 'rect',    bg: '#F8EFD6', border: '#D9B968', ink: '#6A4E14' };
const CAUSE: BlockStyle    = { shape: 'rect',    bg: '#FBF8F2', border: '#DED3C2', ink: '#5C564B' };
const NOTE: BlockStyle     = { shape: 'rect',    bg: '#EEF2F6', border: '#C3BAAC', ink: '#5C564B' };
const WARNING: BlockStyle  = { shape: 'rect',    bg: '#F6E7E2', border: '#D9A18F', ink: '#8A4632' };

const TABLE: Record<BlockType, BlockStyle> = {
  step: STEP,
  decision: DECISION,
  outcome: OUTCOME,
  question: DECISION,
  spine: SPINE,
  category: CATEGORY,
  cause: CAUSE,
  note: NOTE,
  warning: WARNING,
};

export function styleFor(type: BlockType): BlockStyle {
  return TABLE[type];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/canvas/blockStyles.ts src/canvas/blockStyles.test.ts
git commit -m "feat(canvas): block-type visual style table"
```

---

## Task 3: Graph layout (flowchart + decision-tree) via Dagre

**Files:**
- Create: `src/layout/graphLayout.ts`
- Test: `src/layout/graphLayout.test.ts`

Lays out node-and-edge presets top-to-bottom with Dagre. Node sizes come from the block style + size tables so the layout matches what gets rendered. Converts Dagre's center coordinates to React Flow's top-left.

- [ ] **Step 1: Write the failing test**

```ts
// src/layout/graphLayout.test.ts
import { describe, it, expect } from 'vitest';
import { graphLayout } from './graphLayout';
import type { KnowflowDoc } from '../core/types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'flowchart', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('graphLayout', () => {
  it('returns a position for every block', () => {
    const d = doc({
      blocks: [
        { id: 'a', type: 'step', text: 'Start' },
        { id: 'b', type: 'decision', text: 'OK?' },
        { id: 'c', type: 'outcome', text: 'Done' },
      ],
      connections: [
        { id: 'e1', from: 'a', to: 'b' },
        { id: 'e2', from: 'b', to: 'c', label: 'yes' },
      ],
    });
    const pos = graphLayout(d);
    expect(Object.keys(pos).sort()).toEqual(['a', 'b', 'c']);
    for (const id of ['a', 'b', 'c']) {
      expect(typeof pos[id].x).toBe('number');
      expect(typeof pos[id].y).toBe('number');
    }
  });

  it('places connected nodes top-to-bottom (child below parent)', () => {
    const d = doc({
      blocks: [
        { id: 'a', type: 'step', text: 'Start' },
        { id: 'b', type: 'outcome', text: 'Done' },
      ],
      connections: [{ id: 'e1', from: 'a', to: 'b' }],
    });
    const pos = graphLayout(d);
    expect(pos['b'].y).toBeGreaterThan(pos['a'].y);
  });

  it('handles an empty document without throwing', () => {
    expect(graphLayout(doc({}))).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './graphLayout'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/layout/graphLayout.ts
import dagre from '@dagrejs/dagre';
import type { KnowflowDoc } from '../core/types';
import { sizeForShape } from './sizes';
import { styleFor } from '../canvas/blockStyles';

export interface Positions {
  [blockId: string]: { x: number; y: number };
}

export function graphLayout(doc: KnowflowDoc, rankdir: 'TB' | 'LR' = 'TB'): Positions {
  if (doc.blocks.length === 0) return {};

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, nodesep: 60, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const b of doc.blocks) {
    const { width, height } = sizeForShape(styleFor(b.type).shape);
    g.setNode(b.id, { width, height });
  }
  for (const c of doc.connections) {
    if (g.hasNode(c.from) && g.hasNode(c.to)) g.setEdge(c.from, c.to);
  }

  dagre.layout(g);

  const positions: Positions = {};
  for (const b of doc.blocks) {
    const n = g.node(b.id);
    // Dagre reports node centers; React Flow positions by top-left.
    positions[b.id] = { x: n.x - n.width / 2, y: n.y - n.height / 2 };
  }
  return positions;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/layout/graphLayout.ts src/layout/graphLayout.test.ts
git commit -m "feat(layout): Dagre graph layout for flowchart and decision tree"
```

---

## Task 4: Linear layout (step-list)

**Files:**
- Create: `src/layout/linearLayout.ts`
- Test: `src/layout/linearLayout.test.ts`

Stacks blocks vertically in document order with even spacing.

- [ ] **Step 1: Write the failing test**

```ts
// src/layout/linearLayout.test.ts
import { describe, it, expect } from 'vitest';
import { linearLayout } from './linearLayout';
import type { KnowflowDoc } from '../core/types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'stepList', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('linearLayout', () => {
  it('stacks blocks top-to-bottom in order, same x', () => {
    const d = doc({
      blocks: [
        { id: '1', type: 'step', text: 'A' },
        { id: '2', type: 'step', text: 'B' },
        { id: '3', type: 'warning', text: 'C' },
      ],
    });
    const pos = linearLayout(d);
    expect(pos['1'].x).toBe(pos['2'].x);
    expect(pos['2'].y).toBeGreaterThan(pos['1'].y);
    expect(pos['3'].y).toBeGreaterThan(pos['2'].y);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './linearLayout'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/layout/linearLayout.ts
import type { KnowflowDoc } from '../core/types';
import { sizeForShape } from './sizes';
import { styleFor } from '../canvas/blockStyles';
import type { Positions } from './graphLayout';

const GAP = 28;

export function linearLayout(doc: KnowflowDoc): Positions {
  const positions: Positions = {};
  let y = 0;
  for (const b of doc.blocks) {
    const { height } = sizeForShape(styleFor(b.type).shape);
    positions[b.id] = { x: 0, y };
    y += height + GAP;
  }
  return positions;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/layout/linearLayout.ts src/layout/linearLayout.test.ts
git commit -m "feat(layout): linear layout for step lists"
```

---

## Task 5: Fishbone layout

**Files:**
- Create: `src/layout/fishboneLayout.ts`
- Test: `src/layout/fishboneLayout.test.ts`

Spine (effect) sits at the right. Categories alternate above and below a horizontal spine line, spread left-to-right. Each category's causes stack outward (above categories go up, below go down).

- [ ] **Step 1: Write the failing test**

```ts
// src/layout/fishboneLayout.test.ts
import { describe, it, expect } from 'vitest';
import { fishboneLayout } from './fishboneLayout';
import type { KnowflowDoc } from '../core/types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'fishbone', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('fishboneLayout', () => {
  it('positions spine, categories, and causes', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'Effect' },
        { id: 'c1', type: 'category', text: 'Students' },
        { id: 'ca1', type: 'cause', text: 'Not enrolled', categoryId: 'c1' },
        { id: 'c2', type: 'category', text: 'Staff' },
      ],
    });
    const pos = fishboneLayout(d);
    expect(Object.keys(pos).sort()).toEqual(['c1', 'c2', 'ca1', 's']);
  });

  it('places the spine to the right of the first category', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'Effect' },
        { id: 'c1', type: 'category', text: 'Students' },
      ],
    });
    const pos = fishboneLayout(d);
    expect(pos['s'].x).toBeGreaterThan(pos['c1'].x);
  });

  it('alternates categories above and below the spine', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'E' },
        { id: 'c1', type: 'category', text: 'A' },
        { id: 'c2', type: 'category', text: 'B' },
      ],
    });
    const pos = fishboneLayout(d);
    // first category above (smaller y), second below (larger y)
    expect(pos['c1'].y).toBeLessThan(pos['c2'].y);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './fishboneLayout'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/layout/fishboneLayout.ts
import type { KnowflowDoc, Block } from '../core/types';
import type { Positions } from './graphLayout';

const COL = 240;      // horizontal gap between categories
const SPINE_Y = 0;    // spine sits on the centre line
const CAT_OFFSET = 150; // category distance above/below the spine
const CAUSE_GAP = 70;   // gap between stacked causes

export function fishboneLayout(doc: KnowflowDoc): Positions {
  const positions: Positions = {};
  const categories = doc.blocks.filter(b => b.type === 'category');

  categories.forEach((cat, i) => {
    const x = i * COL;
    const above = i % 2 === 0;
    const catY = above ? SPINE_Y - CAT_OFFSET : SPINE_Y + CAT_OFFSET;
    positions[cat.id] = { x, y: catY };

    const causes = doc.blocks.filter((b: Block) => b.type === 'cause' && b.categoryId === cat.id);
    causes.forEach((cause, j) => {
      const step = (j + 1) * CAUSE_GAP;
      // Offset causes outward in BOTH axes so each cause->category bone renders as a diagonal twig.
      positions[cause.id] = { x: x - step * 0.6, y: above ? catY - step : catY + step };
    });
  });

  const spine = doc.blocks.find(b => b.type === 'spine');
  if (spine) {
    positions[spine.id] = { x: Math.max(categories.length, 1) * COL, y: SPINE_Y };
  }
  return positions;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/layout/fishboneLayout.ts src/layout/fishboneLayout.test.ts
git commit -m "feat(layout): fishbone layout (spine + alternating categories)"
```

---

## Task 6: Layout dispatcher

**Files:**
- Create: `src/layout/index.ts`
- Test: `src/layout/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/layout/index.test.ts
import { describe, it, expect } from 'vitest';
import { layoutDoc } from './index';
import { createDoc } from '../core/createDoc';
import { addBlock } from '../core/operations';
import type { Clock } from '../core/ids';

const clock: Clock = { newId: (() => { let n = 0; return () => `id${++n}`; })(), nowIso: () => 'x' };

describe('layoutDoc', () => {
  it('returns positions for each preset without throwing', () => {
    for (const preset of ['flowchart', 'decisionTree', 'stepList', 'fishbone'] as const) {
      let d = createDoc(preset, 'T', clock);
      d = addBlock(d, 'A', undefined, clock).doc;
      const pos = layoutDoc(d);
      for (const b of d.blocks) {
        expect(pos[b.id]).toBeDefined();
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/layout/index.ts
import type { KnowflowDoc } from '../core/types';
import { graphLayout, type Positions } from './graphLayout';
import { linearLayout } from './linearLayout';
import { fishboneLayout } from './fishboneLayout';

export type { Positions } from './graphLayout';

export function layoutDoc(doc: KnowflowDoc): Positions {
  switch (doc.preset) {
    case 'flowchart':
    case 'decisionTree':
      return graphLayout(doc, 'TB');
    case 'stepList':
      return linearLayout(doc);
    case 'fishbone':
      return fishboneLayout(doc);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/layout/index.ts src/layout/index.test.ts
git commit -m "feat(layout): preset layout dispatcher"
```

---

## Task 7: React Flow adapter

**Files:**
- Create: `src/canvas/adapter.ts`
- Test: `src/canvas/adapter.test.ts`

Converts a document + positions into React Flow `nodes`/`edges`. For flowchart/decision-tree, real connections become edges (bottom→top handles). For step-list, consecutive blocks get synthesized sequence edges. For fishbone, synthesized straight rib edges (cause→category, category→spine) using right→left handles. Every node carries `data` the custom component needs.

- [ ] **Step 1: Write the failing test**

```ts
// src/canvas/adapter.test.ts
import { describe, it, expect } from 'vitest';
import { toReactFlow } from './adapter';
import type { KnowflowDoc } from '../core/types';
import { layoutDoc } from '../layout';

function build(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'flowchart', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('toReactFlow adapter', () => {
  it('maps blocks to nodes with position and data', () => {
    const doc = build({
      blocks: [{ id: 'a', type: 'step', text: 'Start' }],
    });
    const { nodes } = toReactFlow(doc, layoutDoc(doc));
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('a');
    expect(nodes[0].type).toBe('knowflow');
    expect(nodes[0].data).toMatchObject({ blockType: 'step', text: 'Start' });
    expect(nodes[0].position).toBeDefined();
  });

  it('maps flowchart connections to edges with labels and arrowheads', () => {
    const doc = build({
      blocks: [
        { id: 'a', type: 'step', text: 'Start' },
        { id: 'b', type: 'outcome', text: 'Done' },
      ],
      connections: [{ id: 'e1', from: 'a', to: 'b', label: 'yes' }],
    });
    const { edges } = toReactFlow(doc, layoutDoc(doc));
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ id: 'e1', source: 'a', target: 'b', label: 'yes' });
    expect(edges[0].markerEnd).toBeDefined();
  });

  it('synthesizes sequence edges for step lists', () => {
    const doc = build({
      preset: 'stepList',
      blocks: [
        { id: '1', type: 'step', text: 'A' },
        { id: '2', type: 'step', text: 'B' },
        { id: '3', type: 'step', text: 'C' },
      ],
    });
    const { edges } = toReactFlow(doc, layoutDoc(doc));
    expect(edges).toHaveLength(2);
    expect(edges.map(e => [e.source, e.target])).toEqual([['1', '2'], ['2', '3']]);
  });

  it('synthesizes rib edges for fishbone (cause->category, category->spine)', () => {
    const doc = build({
      preset: 'fishbone',
      blocks: [
        { id: 's', type: 'spine', text: 'E' },
        { id: 'c1', type: 'category', text: 'Students' },
        { id: 'ca1', type: 'cause', text: 'x', categoryId: 'c1' },
      ],
    });
    const { edges } = toReactFlow(doc, layoutDoc(doc));
    const pairs = edges.map(e => [e.source, e.target]).sort();
    expect(pairs).toEqual([['c1', 's'], ['ca1', 'c1']].sort());
    expect(edges.every(e => e.type === 'floating')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './adapter'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/canvas/adapter.ts
import { MarkerType, type Node, type Edge } from '@xyflow/react';
import type { KnowflowDoc, BlockType } from '../core/types';
import type { Positions } from '../layout';

export interface KnowflowNodeData extends Record<string, unknown> {
  blockType: BlockType;
  text: string;
}

const MARKER = { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#B6AC9B' };

function nodesFor(doc: KnowflowDoc, positions: Positions): Node<KnowflowNodeData>[] {
  return doc.blocks.map(b => ({
    id: b.id,
    type: 'knowflow',
    position: positions[b.id] ?? { x: 0, y: 0 },
    data: { blockType: b.type, text: b.text },
  }));
}

function graphEdges(doc: KnowflowDoc): Edge[] {
  return doc.connections.map(c => ({
    id: c.id, source: c.from, target: c.to, label: c.label,
    type: 'smoothstep', sourceHandle: 'b', targetHandle: 't', markerEnd: MARKER,
  }));
}

function sequenceEdges(doc: KnowflowDoc): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < doc.blocks.length - 1; i++) {
    const from = doc.blocks[i], to = doc.blocks[i + 1];
    edges.push({
      id: `seq-${from.id}-${to.id}`, source: from.id, target: to.id,
      type: 'smoothstep', sourceHandle: 'b', targetHandle: 't', markerEnd: MARKER,
    });
  }
  return edges;
}

function ribEdges(doc: KnowflowDoc): Edge[] {
  const edges: Edge[] = [];
  const spine = doc.blocks.find(b => b.type === 'spine');
  // type 'floating' = our custom diagonal edge (Task 8); it computes endpoints from node
  // geometry, so no sourceHandle/targetHandle is set and the line follows the true slant.
  for (const cat of doc.blocks.filter(b => b.type === 'category')) {
    if (spine) {
      edges.push({ id: `rib-${cat.id}-${spine.id}`, source: cat.id, target: spine.id, type: 'floating', markerEnd: MARKER });
    }
    for (const cause of doc.blocks.filter(b => b.type === 'cause' && b.categoryId === cat.id)) {
      edges.push({ id: `rib-${cause.id}-${cat.id}`, source: cause.id, target: cat.id, type: 'floating', markerEnd: MARKER });
    }
  }
  return edges;
}

export function toReactFlow(doc: KnowflowDoc, positions: Positions): { nodes: Node<KnowflowNodeData>[]; edges: Edge[] } {
  const nodes = nodesFor(doc, positions);
  let edges: Edge[];
  switch (doc.preset) {
    case 'flowchart':
    case 'decisionTree': edges = graphEdges(doc); break;
    case 'stepList':     edges = sequenceEdges(doc); break;
    case 'fishbone':     edges = ribEdges(doc); break;
  }
  return { nodes, edges };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/canvas/adapter.ts src/canvas/adapter.test.ts
git commit -m "feat(canvas): document-to-ReactFlow adapter"
```

---

## Task 8: Floating diagonal edge (fishbone bones)

**Files:**
- Create: `src/canvas/floatingEdge.ts`
- Create: `src/canvas/FloatingEdge.tsx`
- Test: `src/canvas/floatingEdge.test.ts`

A custom edge that draws a straight line between the **borders** of its two nodes, computed from node geometry rather than fixed handles — so a category-to-spine or cause-to-category connection renders as a true diagonal. `getEdgeParams` is the border-intersection helper from the official React Flow v12 floating-edges example (verified: reads `node.internals.positionAbsolute` and `node.measured.width/height` — the v12 field names; v11's `positionAbsolute`/`width` would return `undefined` and produce `NaN`).

- [ ] **Step 1: Write the failing test for `getEdgeParams`**

```ts
// src/canvas/floatingEdge.test.ts
import { describe, it, expect } from 'vitest';
import { getEdgeParams } from './floatingEdge';

// Minimal InternalNode stand-in (only the fields getEdgeParams reads).
function fakeNode(x: number, y: number, width = 100, height = 50) {
  return { measured: { width, height }, internals: { positionAbsolute: { x, y } } } as never;
}

describe('getEdgeParams', () => {
  it('returns finite endpoints between two nodes', () => {
    const { sx, sy, tx, ty } = getEdgeParams(fakeNode(0, 0), fakeNode(300, 200));
    for (const v of [sx, sy, tx, ty]) expect(Number.isFinite(v)).toBe(true);
  });

  it('source endpoint exits toward the target', () => {
    // a at origin (center 50,25), b directly to the right
    const { sx } = getEdgeParams(fakeNode(0, 0, 100, 50), fakeNode(400, 0, 100, 50));
    expect(sx).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './floatingEdge'`.

- [ ] **Step 3: Write `floatingEdge.ts`**

```ts
// src/canvas/floatingEdge.ts
import type { InternalNode, Node } from '@xyflow/react';

// Border-intersection point on `node` of the line toward `target`'s centre.
// Adapted verbatim from the official React Flow v12 floating-edges example.
function getNodeIntersection(node: InternalNode<Node>, target: InternalNode<Node>) {
  const w = (node.measured.width ?? 0) / 2;
  const h = (node.measured.height ?? 0) / 2;
  const x2 = node.internals.positionAbsolute.x + w;
  const y2 = node.internals.positionAbsolute.y + h;
  const x1 = target.internals.positionAbsolute.x + (target.measured.width ?? 0) / 2;
  const y1 = target.internals.positionAbsolute.y + (target.measured.height ?? 0) / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  return { x: w * (xx3 + yy3) + x2, y: h * (-xx3 + yy3) + y2 };
}

export interface EdgeEndpoints { sx: number; sy: number; tx: number; ty: number; }

export function getEdgeParams(source: InternalNode<Node>, target: InternalNode<Node>): EdgeEndpoints {
  const s = getNodeIntersection(source, target);
  const t = getNodeIntersection(target, source);
  return { sx: s.x, sy: s.y, tx: t.x, ty: t.y };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS. (Type-only imports from `@xyflow/react` are erased, so this test does not load React Flow's runtime.)

- [ ] **Step 5: Write the `FloatingEdge` component**

```tsx
// src/canvas/FloatingEdge.tsx
import { BaseEdge, getStraightPath, useInternalNode, type EdgeProps } from '@xyflow/react';
import { getEdgeParams } from './floatingEdge';

export function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  // Guard: nodes not mounted yet, or not measured on first paint (avoids NaN paths).
  if (!sourceNode || !targetNode) return null;
  if (!sourceNode.measured.width || !targetNode.measured.width) return null;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);
  const [path] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/canvas/floatingEdge.ts src/canvas/floatingEdge.test.ts src/canvas/FloatingEdge.tsx
git commit -m "feat(canvas): floating straight edge for diagonal fishbone bones"
```

---

## Task 9: Custom node component

**Files:**
- Create: `src/canvas/KnowflowNode.tsx`
- Create: `src/canvas/KnowflowNode.css`

No unit test (visual React component; verified in the harness in Task 11). Renders the right shape and colors from the style table and exposes four handles (`t` target, `b` source, `l` target, `r` source). The handles double as mount points for the floating fishbone edges (custom nodes need at least one handle for an edge to mount; these are visually hidden via CSS `opacity:0`, never `display:none`). Diamond uses the rotate-square / counter-rotate-label technique so text stays upright.

- [ ] **Step 1: Write the component**

```tsx
// src/canvas/KnowflowNode.tsx
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { KnowflowNodeData } from './adapter';
import { styleFor } from './blockStyles';
import { sizeForShape } from '../layout/sizes';
import './KnowflowNode.css';

type KNode = Node<KnowflowNodeData, 'knowflow'>;

export function KnowflowNode({ data, selected }: NodeProps<KNode>) {
  const style = styleFor(data.blockType);
  const { width, height } = sizeForShape(style.shape);
  const cssVars = {
    '--bg': style.bg, '--border': style.border, '--ink': style.ink,
    width, height,
  } as React.CSSProperties;

  return (
    <div
      className={`kf-node kf-${style.shape} ${selected ? 'kf-selected' : ''}`}
      style={cssVars}
    >
      <Handle id="t" type="target" position={Position.Top} />
      <Handle id="l" type="target" position={Position.Left} />
      <div className="kf-label">{data.text}</div>
      <Handle id="b" type="source" position={Position.Bottom} />
      <Handle id="r" type="source" position={Position.Right} />
    </div>
  );
}
```

- [ ] **Step 2: Write the styles**

```css
/* src/canvas/KnowflowNode.css */
.kf-node {
  box-sizing: border-box;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg); border: 1.5px solid var(--border); color: var(--ink);
  font-family: "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;
  font-weight: 600; font-size: 13.5px; text-align: center;
  box-shadow: 0 1px 2px rgba(41,40,31,.06), 0 8px 20px -14px rgba(41,40,31,.25);
}
.kf-rect { border-radius: 12px; padding: 10px 14px; }
.kf-pill { border-radius: 999px; padding: 10px 18px; }
.kf-diamond { transform: rotate(45deg); border-radius: 14px; }
.kf-diamond .kf-label { transform: rotate(-45deg); max-width: 120px; }
.kf-label { line-height: 1.25; overflow-wrap: anywhere; }
.kf-selected { outline: 3px solid #0F766E; outline-offset: 3px; box-shadow: 0 0 0 6px rgba(15,118,110,.18); }
/* React Flow handles: keep them subtle for a read-only diagram */
.kf-node .react-flow__handle { width: 6px; height: 6px; background: #C6BCAB; border: none; opacity: 0; }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/canvas/KnowflowNode.tsx src/canvas/KnowflowNode.css
git commit -m "feat(canvas): custom node component (rect/diamond/pill)"
```

---

## Task 10: DiagramCanvas component

**Files:**
- Create: `src/canvas/DiagramCanvas.tsx`

Wraps `<ReactFlow>` read-only. Takes a `KnowflowDoc`, computes layout + adapter internally, registers the node type (defined at module scope), fits the view when the document changes, and reports selection upward via an optional callback (unused until Plan 3, wired now to avoid churn).

- [ ] **Step 1: Write the component**

```tsx
// src/canvas/DiagramCanvas.tsx
import { useEffect, useMemo } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow,
  type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { KnowflowDoc } from '../core/types';
import { layoutDoc } from '../layout';
import { toReactFlow, type KnowflowNodeData } from './adapter';
import { KnowflowNode } from './KnowflowNode';
import { FloatingEdge } from './FloatingEdge';

// Must be defined outside the component (React Flow requirement).
const nodeTypes = { knowflow: KnowflowNode };
const edgeTypes = { floating: FloatingEdge };

interface Props {
  doc: KnowflowDoc;
  onSelect?: (blockId: string | null) => void;
}

function Inner({ doc, onSelect }: Props) {
  const { fitView } = useReactFlow();
  const { nodes, edges } = useMemo<{ nodes: Node<KnowflowNodeData>[]; edges: Edge[] }>(
    () => toReactFlow(doc, layoutDoc(doc)),
    [doc],
  );

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 0);
    return () => clearTimeout(t);
  }, [doc, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      fitView
      onSelectionChange={({ nodes }) => onSelect?.(nodes[0]?.id ?? null)}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={24} size={1.1} color="#D4DDE7" />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export function DiagramCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If `proOptions.hideAttribution` triggers a license note, leave it — it's permitted for the free MIT build; remove the prop if it causes a type error.)

- [ ] **Step 3: Commit**

```bash
git add src/canvas/DiagramCanvas.tsx
git commit -m "feat(canvas): read-only DiagramCanvas wrapper"
```

---

## Task 11: Sample documents + dev harness

**Files:**
- Create: `src/canvas/samples.ts`
- Modify: `src/App.tsx` (replace Vite default)
- Modify: `src/App.css` (replace with harness styling)

A sample document per preset (flowchart + fishbone reuse the disabled-accounts example), and an `App` that switches preset and renders `DiagramCanvas` full-screen.

- [ ] **Step 1: Write sample documents**

```ts
// src/canvas/samples.ts
import type { KnowflowDoc, Preset } from '../core/types';

const meta = { createdAt: '2026-06-13T00:00:00Z', updatedAt: '2026-06-13T00:00:00Z', status: 'draft' as const, version: 1 };

const flowchart: KnowflowDoc = {
  id: 'sample-flow', title: 'Handling disabled accounts', preset: 'flowchart', meta,
  blocks: [
    { id: 'a', type: 'step', text: 'Disabled-account ticket arrives' },
    { id: 'b', type: 'decision', text: 'Account locked?' },
    { id: 'c', type: 'outcome', text: 'Unlock account' },
    { id: 'd', type: 'step', text: 'Reset password' },
    { id: 'e', type: 'decision', text: 'Student account?' },
    { id: 'f', type: 'outcome', text: 'Notify SIS team' },
    { id: 'g', type: 'outcome', text: 'Re-enable in AD' },
  ],
  connections: [
    { id: 'e1', from: 'a', to: 'b' },
    { id: 'e2', from: 'b', to: 'c', label: 'Yes' },
    { id: 'e3', from: 'b', to: 'd', label: 'No' },
    { id: 'e4', from: 'd', to: 'e' },
    { id: 'e5', from: 'e', to: 'f', label: 'Yes' },
    { id: 'e6', from: 'e', to: 'g', label: 'No' },
  ],
};

const decisionTree: KnowflowDoc = {
  id: 'sample-tree', title: 'Which account action?', preset: 'decisionTree', meta,
  blocks: [
    { id: 'q1', type: 'question', text: 'User type?' },
    { id: 'q2', type: 'question', text: 'Still enrolled?' },
    { id: 'o1', type: 'outcome', text: 'Re-enable' },
    { id: 'o2', type: 'outcome', text: 'Suspend' },
    { id: 'o3', type: 'outcome', text: 'Escalate to HR' },
  ],
  connections: [
    { id: 't1', from: 'q1', to: 'q2', label: 'Student' },
    { id: 't2', from: 'q1', to: 'o3', label: 'Staff' },
    { id: 't3', from: 'q2', to: 'o1', label: 'Yes' },
    { id: 't4', from: 'q2', to: 'o2', label: 'No' },
  ],
};

const stepList: KnowflowDoc = {
  id: 'sample-steps', title: 'Reset a password', preset: 'stepList', meta,
  blocks: [
    { id: '1', type: 'step', text: 'Open the admin console' },
    { id: '2', type: 'step', text: 'Search for the user account' },
    { id: '3', type: 'warning', text: 'Confirm identity before resetting' },
    { id: '4', type: 'step', text: 'Issue a temporary password' },
    { id: '5', type: 'note', text: 'User must change it at next login' },
  ],
  connections: [],
};

const fishbone: KnowflowDoc = {
  id: 'sample-fish', title: 'Account stays disabled', preset: 'fishbone', meta,
  blocks: [
    { id: 's', type: 'spine', text: 'Account stays disabled' },
    { id: 'c1', type: 'category', text: 'Students' },
    { id: 'c2', type: 'category', text: 'Staff' },
    { id: 'c3', type: 'category', text: 'Contractors' },
    { id: 'c4', type: 'category', text: 'Guests' },
    { id: 'x1', type: 'cause', text: 'Not enrolled this term', categoryId: 'c1' },
    { id: 'x2', type: 'cause', text: 'Graduated', categoryId: 'c1' },
    { id: 'x3', type: 'cause', text: 'On leave', categoryId: 'c2' },
    { id: 'x4', type: 'cause', text: 'Contract expired', categoryId: 'c3' },
    { id: 'x5', type: 'cause', text: 'Sponsor inactive', categoryId: 'c4' },
  ],
  connections: [],
};

export const SAMPLES: Record<Preset, KnowflowDoc> = { flowchart, decisionTree, stepList, fishbone };
```

- [ ] **Step 2: Replace `src/App.tsx` with the harness**

```tsx
// src/App.tsx
import { useState } from 'react';
import type { Preset } from './core/types';
import { ALL_PRESETS } from './core/types';
import { getPreset } from './core/presets';
import { DiagramCanvas } from './canvas/DiagramCanvas';
import { SAMPLES } from './canvas/samples';
import './App.css';

export default function App() {
  const [preset, setPreset] = useState<Preset>('flowchart');
  const doc = SAMPLES[preset];

  return (
    <div className="harness">
      <header className="harness-bar">
        <span className="harness-brand">know<b>flow</b></span>
        <span className="harness-title">{doc.title}</span>
        <div className="harness-presets">
          {ALL_PRESETS.map(p => (
            <button
              key={p}
              className={p === preset ? 'on' : ''}
              onClick={() => setPreset(p)}
            >
              {getPreset(p).name}
            </button>
          ))}
        </div>
      </header>
      <div className="harness-canvas">
        <DiagramCanvas doc={doc} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/App.css`**

```css
/* src/App.css */
.harness { height: 100vh; display: flex; flex-direction: column; background: #F6F2EA; }
.harness-bar { display: flex; align-items: center; gap: 16px; padding: 10px 18px;
  background: #FFFEFB; border-bottom: 1px solid #EAE2D6; }
.harness-brand { font-family: Georgia, serif; font-weight: 600; font-size: 18px; }
.harness-brand b { color: #0F766E; }
.harness-title { font-size: 15px; color: #29281F; }
.harness-presets { margin-left: auto; display: flex; gap: 6px; }
.harness-presets button { font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
  border: 1px solid #DED3C2; background: #fff; color: #5C564B; border-radius: 8px; padding: 6px 12px; }
.harness-presets button.on { background: #0F766E; color: #fff; border-color: #0F766E; }
.harness-canvas { flex: 1; min-height: 0; }
```

- [ ] **Step 4: Run the dev server and verify visually**

Run: `npm run dev`
Then open the printed local URL in a browser and confirm ALL of these by hand:
- Flowchart: steps (blue rects), decisions (amber diamonds with upright text), outcomes (green pills), arrows with "Yes"/"No" labels, laid out top-to-bottom without overlap.
- Decision Tree: question diamonds branch to outcomes with answer labels.
- Step List: vertical sequence of numbered-feeling steps, with the warning and note visibly distinct.
- Fishbone: spine (effect) on the right, categories alternating above/below, and bones rendering as **diagonal/slanted** lines (category→spine and cause→category), not horizontal. Confirm the slant reads as a fishbone; if it looks too much like rays converging on the effect box, note it — the next iteration adds spine joints.
- Switching presets re-renders and the view re-fits.
- No console errors; React Flow attribution hidden; dotted background visible.

Stop the dev server (Ctrl-C) when done.

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/canvas/samples.ts src/App.tsx src/App.css
git commit -m "feat(canvas): sample documents and preset-switcher dev harness"
```

---

## Task 12: Clean up unused scaffold assets

**Files:**
- Delete: `src/assets/react.svg`, `src/assets/hero.png`, `src/assets/vite.svg` (Vite defaults, now unused)
- Modify: `src/index.css` (remove Vite default demo styles that conflict; keep a minimal reset + the Hanken Grotesk font import)

Only remove assets that THIS plan orphaned by replacing `App.tsx`. Do not touch `src/core`.

- [ ] **Step 1: Confirm the assets are unreferenced**

Run: `grep -rn "react.svg\|hero.png\|vite.svg" src/`
Expected: no references (the old `App.tsx` that used them was replaced in Task 10).

- [ ] **Step 2: Delete the orphaned assets**

```bash
git rm src/assets/react.svg src/assets/hero.png src/assets/vite.svg
```

- [ ] **Step 3: Replace `src/index.css` with a minimal base**

```css
/* src/index.css */
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap');

:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; }
body { font-family: "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif; }
```

- [ ] **Step 4: Verify build still works**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove orphaned Vite scaffold assets; minimal base CSS"
```

---

## Self-Review (completed by plan author)

**Spec coverage (Plan 2 = canvas/rendering portion of Slice 1):**
- Render all four presets — Tasks 3–6 (layout) + 7 (adapter) + 8 (floating edge) + 9–10 (node + canvas) + 11 (harness proves all four). ✓
- Per-preset auto-layout — Task 3 (Dagre flowchart/tree), Task 4 (step-list), Task 5 (fishbone, diagonal), Task 6 (dispatcher). ✓
- Fishbone diagonal bones (user-requested) — Task 5 (diagonal positioning) + Task 7 (edges typed `floating`) + Task 8 (floating straight edge via verified `getEdgeParams`). ✓
- React Flow integration with verified v12 API — Tasks 8 (custom floating edge, `getStraightPath`, `useInternalNode`), 9–10 (nodeTypes/edgeTypes outside component, CSS import, read-only props, fitView in effect, ArrowClosed marker). ✓
- Visual language consistent with the approved mockup — Task 2 style table + Task 9 CSS. ✓
- Deferred correctly to later plans: editing (palette/inspector wired to operations) → Plan 3; accessible narrative view + export → Plan 4.

**Placeholder scan:** No TBD/TODO. Pure-logic tasks (1–8 incl. `getEdgeParams`) are full TDD with real assertions. Visual component tasks (9–11) have complete code and an explicit manual verification checklist (correct for a visual canvas where unit tests add little value). ✓

**Type consistency:** `Positions` defined in `graphLayout.ts` (Task 3), re-exported from `layout/index.ts` (Task 6), imported by `adapter.ts` (Task 7). `KnowflowNodeData` defined in `adapter.ts` (Task 7), consumed by `KnowflowNode.tsx` (Task 9) and `DiagramCanvas.tsx` (Task 10). `getEdgeParams`/`EdgeEndpoints` defined in `floatingEdge.ts` (Task 8), used by `FloatingEdge.tsx` (Task 8) and registered as `edgeTypes = { floating: FloatingEdge }` in `DiagramCanvas.tsx` (Task 10) — matching `type: 'floating'` set by the adapter (Task 7). Node `type: 'knowflow'` (adapter, Task 7) matches `nodeTypes = { knowflow: KnowflowNode }` (Task 10). Handle ids `t/b/l/r` defined in Task 9 match `sourceHandle`/`targetHandle` values for graph/sequence edges in the adapter (Task 7); floating edges set no handles (geometry computed). `sizeForShape`/`styleFor` signatures consistent across Tasks 1–9. ✓

**Known limitation flagged in-plan:** fishbone bones render as diagonal floating edges that converge on the effect box — genuinely slanted (the user's request), but not yet a true horizontal spine with bones meeting it at distinct joints. That fuller Ishikawa geometry (synthetic spine-joint nodes) and possible drag-with-snap are explicit next-iteration items, called out in the design decisions and Task 11 verification.
