# knowflow Slice 1 — Foundation (Document Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure-TypeScript core of knowflow — the document model, the four preset vocabularies with validation, the edit operations, browser persistence, and JSON import/export — fully unit-tested, with no UI and no diagram-library dependencies.

**Architecture:** Everything is a pure function over an immutable `KnowflowDoc` JSON value. A `PresetRegistry` maps each preset id to a `PresetDef` that owns its block vocabulary, validation rules, and narration order. Edit operations and persistence are framework-agnostic functions the later UI plans will call. No React, no React Flow, no DOM in this plan.

**Tech Stack:** TypeScript, Vite (react-ts scaffold, React unused until Plan 2), Vitest for testing.

**This is Plan 1 of 3 for Slice 1.** Plan 2 = React Flow canvas + per-preset auto-layout + inspector UI. Plan 3 = accessible narrative view + PNG/PDF/JSON export UI. Those depend on this core.

---

## File Structure

All core code lives under `src/core/`, split by responsibility (files that change together live together). Tests sit beside the code they test (`*.test.ts`).

- `src/core/types.ts` — all shared types (`KnowflowDoc`, `Block`, `Connection`, `BlockType`, `Preset`, `ValidationError`). One responsibility: the vocabulary of the domain.
- `src/core/ids.ts` — id + timestamp generation, injectable for deterministic tests.
- `src/core/createDoc.ts` — factory that builds a valid empty document for a given preset.
- `src/core/presets/types.ts` — the `PresetDef` interface.
- `src/core/presets/flowchart.ts` — flowchart vocabulary, validation, narration order.
- `src/core/presets/decisionTree.ts` — decision-tree vocabulary, validation, narration order.
- `src/core/presets/fishbone.ts` — fishbone vocabulary, validation, narration order.
- `src/core/presets/stepList.ts` — step-list vocabulary, validation, narration order.
- `src/core/presets/index.ts` — the registry mapping `Preset` → `PresetDef`.
- `src/core/operations.ts` — pure edit operations (add/delete/edit/swap/connect/recategorize/reorder).
- `src/core/persistence.ts` — `localStorage`-backed document repository.
- `src/core/serialize.ts` — JSON export/import with validation.

---

## Task 0: Scaffold the project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx` (via Vite template)
- Create: `vitest.config.ts`

- [ ] **Step 1: Scaffold Vite react-ts into the existing repo**

The repo already contains `.git`, `docs/`, `README.md`, `.gitignore`. Scaffold in place (Vite allows a non-empty directory; it keeps existing files it doesn't own).

Run:
```bash
cd /Users/tnt/Projects/knowflow
npm create vite@latest . -- --template react-ts
```
When prompted about the non-empty directory, choose **"Ignore files and continue"**. Then:
```bash
npm install
```

- [ ] **Step 2: Add Vitest**

Run:
```bash
npm install -D vitest
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Add the test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify the toolchain with a smoke test**

Create `src/core/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS, 1 test passing.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/core/smoke.test.ts
git add -A
git commit -m "chore: scaffold Vite react-ts + Vitest"
```

---

## Task 1: Domain types

**Files:**
- Create: `src/core/types.ts`
- Test: `src/core/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/types.test.ts
import { describe, it, expect } from 'vitest';
import type { KnowflowDoc, Block, Connection } from './types';
import { ALL_BLOCK_TYPES, ALL_PRESETS } from './types';

describe('domain types', () => {
  it('exposes every block type and preset as runtime arrays', () => {
    expect(ALL_PRESETS).toEqual(['flowchart', 'decisionTree', 'fishbone', 'stepList']);
    expect(ALL_BLOCK_TYPES).toContain('step');
    expect(ALL_BLOCK_TYPES).toContain('decision');
    expect(ALL_BLOCK_TYPES).toContain('spine');
  });

  it('a document literal satisfies the types', () => {
    const block: Block = { id: 'b1', type: 'step', text: 'Do a thing' };
    const conn: Connection = { id: 'c1', from: 'b1', to: 'b2' };
    const doc: KnowflowDoc = {
      id: 'd1', title: 'T', preset: 'flowchart',
      blocks: [block], connections: [conn],
      meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    };
    expect(doc.blocks[0].text).toBe('Do a thing');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './types'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/types.ts

export const ALL_PRESETS = ['flowchart', 'decisionTree', 'fishbone', 'stepList'] as const;
export type Preset = (typeof ALL_PRESETS)[number];

export const ALL_BLOCK_TYPES = [
  'step', 'decision', 'outcome', // flowchart
  'question',                    // decisionTree (+ outcome)
  'spine', 'category', 'cause',  // fishbone
  'note', 'warning',             // stepList (+ step)
] as const;
export type BlockType = (typeof ALL_BLOCK_TYPES)[number];

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  /** Fishbone only: the category a cause attaches to. */
  categoryId?: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface DocMeta {
  author?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'official';
  version: number;
}

export interface KnowflowDoc {
  id: string;
  title: string;
  preset: Preset;
  blocks: Block[];
  connections: Connection[];
  meta: DocMeta;
}

export interface ValidationError {
  code: string;
  message: string;
  blockId?: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts src/core/types.test.ts
git commit -m "feat(core): domain types for documents, blocks, connections"
```

---

## Task 2: Id and clock helpers

**Files:**
- Create: `src/core/ids.ts`
- Test: `src/core/ids.test.ts`

Operations need ids and timestamps. To keep operations testable, both are injectable. `nowIso()` and `newId()` are the production defaults; tests pass fakes.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/ids.test.ts
import { describe, it, expect } from 'vitest';
import { newId, nowIso } from './ids';

describe('ids', () => {
  it('newId returns a non-empty unique string', () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe('');
    expect(a).not.toBe(b);
  });

  it('nowIso returns an ISO-8601 string', () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './ids'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/ids.ts

export function newId(): string {
  // crypto.randomUUID is available in modern browsers and Node >= 19.
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Clock type used by operations so tests can inject deterministic values. */
export interface Clock {
  newId: () => string;
  nowIso: () => string;
}

export const systemClock: Clock = { newId, nowIso };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/ids.ts src/core/ids.test.ts
git commit -m "feat(core): injectable id and clock helpers"
```

---

## Task 3: Document factory

**Files:**
- Create: `src/core/createDoc.ts`
- Test: `src/core/createDoc.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/createDoc.test.ts
import { describe, it, expect } from 'vitest';
import { createDoc } from './createDoc';
import type { Clock } from './ids';

const fixedClock: Clock = {
  newId: (() => { let n = 0; return () => `id${++n}`; })(),
  nowIso: () => '2026-06-12T00:00:00.000Z',
};

describe('createDoc', () => {
  it('creates an empty draft for a preset', () => {
    const doc = createDoc('flowchart', 'Untitled', fixedClock);
    expect(doc.preset).toBe('flowchart');
    expect(doc.title).toBe('Untitled');
    expect(doc.blocks).toEqual([]);
    expect(doc.connections).toEqual([]);
    expect(doc.meta.status).toBe('draft');
    expect(doc.meta.version).toBe(1);
    expect(doc.meta.createdAt).toBe('2026-06-12T00:00:00.000Z');
    expect(doc.meta.updatedAt).toBe(doc.meta.createdAt);
    expect(doc.id).toBeTruthy();
  });

  it('seeds a fishbone with a single spine block', () => {
    const doc = createDoc('fishbone', 'Causes', fixedClock);
    const spines = doc.blocks.filter(b => b.type === 'spine');
    expect(spines).toHaveLength(1);
    expect(spines[0].text).toBe('Causes');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './createDoc'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/createDoc.ts
import type { KnowflowDoc, Preset, Block } from './types';
import { systemClock, type Clock } from './ids';

export function createDoc(preset: Preset, title = 'Untitled', clock: Clock = systemClock): KnowflowDoc {
  const now = clock.nowIso();
  const blocks: Block[] = [];

  // Fishbone is invalid without exactly one spine, so seed it.
  if (preset === 'fishbone') {
    blocks.push({ id: clock.newId(), type: 'spine', text: title });
  }

  return {
    id: clock.newId(),
    title,
    preset,
    blocks,
    connections: [],
    meta: { createdAt: now, updatedAt: now, status: 'draft', version: 1 },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/createDoc.ts src/core/createDoc.test.ts
git commit -m "feat(core): document factory with preset-aware seeding"
```

---

## Task 4: PresetDef interface

**Files:**
- Create: `src/core/presets/types.ts`

No test (interface only); it is exercised by the preset tests that follow.

- [ ] **Step 1: Write the implementation**

```ts
// src/core/presets/types.ts
import type { KnowflowDoc, Block, BlockType, Preset, ValidationError } from '../types';

export interface PresetDef {
  id: Preset;
  name: string;
  /** Block types a user may add in this preset. */
  blockTypes: BlockType[];
  /** Default block type used when adding without specifying one. */
  defaultBlockType: BlockType;
  /** Returns validation errors; empty array means valid. */
  validate(doc: KnowflowDoc): ValidationError[];
  /** Blocks in the order they should be narrated for the accessible view. */
  narrationOrder(doc: KnowflowDoc): Block[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/presets/types.ts
git commit -m "feat(core): PresetDef interface"
```

---

## Task 5: Flowchart preset

**Files:**
- Create: `src/core/presets/flowchart.ts`
- Test: `src/core/presets/flowchart.test.ts`

Rules: block types are `step | decision | outcome`; connections must reference existing blocks; a `decision` must have at least one outgoing connection. Narration order is a breadth-first walk from blocks with no incoming connection (falling back to document order for any unreached blocks).

- [ ] **Step 1: Write the failing test**

```ts
// src/core/presets/flowchart.test.ts
import { describe, it, expect } from 'vitest';
import { flowchart } from './flowchart';
import type { KnowflowDoc } from '../types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'flowchart', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('flowchart preset', () => {
  it('accepts a valid flowchart', () => {
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
    expect(flowchart.validate(d)).toEqual([]);
  });

  it('rejects a block of a foreign type', () => {
    const d = doc({ blocks: [{ id: 'a', type: 'spine', text: 'x' }] });
    const errs = flowchart.validate(d);
    expect(errs.some(e => e.code === 'illegal-block-type')).toBe(true);
  });

  it('rejects a connection to a missing block', () => {
    const d = doc({
      blocks: [{ id: 'a', type: 'step', text: 'x' }],
      connections: [{ id: 'e', from: 'a', to: 'ghost' }],
    });
    expect(flowchart.validate(d).some(e => e.code === 'dangling-connection')).toBe(true);
  });

  it('flags a decision with no outgoing branch', () => {
    const d = doc({ blocks: [{ id: 'a', type: 'decision', text: 'OK?' }] });
    expect(flowchart.validate(d).some(e => e.code === 'decision-no-branches')).toBe(true);
  });

  it('narrates breadth-first from the start block', () => {
    const d = doc({
      blocks: [
        { id: 'c', type: 'outcome', text: 'Done' },
        { id: 'a', type: 'step', text: 'Start' },
        { id: 'b', type: 'decision', text: 'OK?' },
      ],
      connections: [
        { id: 'e1', from: 'a', to: 'b' },
        { id: 'e2', from: 'b', to: 'c', label: 'yes' },
      ],
    });
    expect(flowchart.narrationOrder(d).map(b => b.id)).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './flowchart'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/presets/flowchart.ts
import type { KnowflowDoc, Block, BlockType, ValidationError } from '../types';
import type { PresetDef } from './types';

const ALLOWED: BlockType[] = ['step', 'decision', 'outcome'];

function validate(doc: KnowflowDoc): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set(doc.blocks.map(b => b.id));

  for (const b of doc.blocks) {
    if (!ALLOWED.includes(b.type)) {
      errors.push({ code: 'illegal-block-type', blockId: b.id, message: `"${b.type}" is not allowed in a flowchart.` });
    }
  }
  for (const c of doc.connections) {
    if (!ids.has(c.from) || !ids.has(c.to)) {
      errors.push({ code: 'dangling-connection', message: `Connection ${c.id} points to a missing block.` });
    }
  }
  const hasOutgoing = new Set(doc.connections.map(c => c.from));
  for (const b of doc.blocks) {
    if (b.type === 'decision' && !hasOutgoing.has(b.id)) {
      errors.push({ code: 'decision-no-branches', blockId: b.id, message: `Decision "${b.text}" has no branches.` });
    }
  }
  return errors;
}

/** Breadth-first from roots (no incoming edge); unreached blocks appended in document order. */
export function bfsOrder(doc: KnowflowDoc): Block[] {
  const byId = new Map(doc.blocks.map(b => [b.id, b]));
  const incoming = new Set(doc.connections.map(c => c.to));
  const out = new Map<string, string[]>();
  for (const c of doc.connections) {
    if (!out.has(c.from)) out.set(c.from, []);
    out.get(c.from)!.push(c.to);
  }
  const roots = doc.blocks.filter(b => !incoming.has(b.id));
  const queue = (roots.length ? roots : doc.blocks).map(b => b.id);
  const seen = new Set<string>();
  const ordered: Block[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const b = byId.get(id);
    if (b) ordered.push(b);
    for (const next of out.get(id) ?? []) if (!seen.has(next)) queue.push(next);
  }
  for (const b of doc.blocks) if (!seen.has(b.id)) ordered.push(b);
  return ordered;
}

export const flowchart: PresetDef = {
  id: 'flowchart',
  name: 'Flowchart',
  blockTypes: ALLOWED,
  defaultBlockType: 'step',
  validate,
  narrationOrder: bfsOrder,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/presets/flowchart.ts src/core/presets/flowchart.test.ts
git commit -m "feat(core): flowchart preset with validation and BFS narration"
```

---

## Task 6: Decision-tree preset

**Files:**
- Create: `src/core/presets/decisionTree.ts`
- Test: `src/core/presets/decisionTree.test.ts`

Rules: block types are `question | outcome`; tree shape (no block has more than one incoming connection); connections leaving a `question` must carry a label. Narration reuses the BFS order from the flowchart module (DRY).

- [ ] **Step 1: Write the failing test**

```ts
// src/core/presets/decisionTree.test.ts
import { describe, it, expect } from 'vitest';
import { decisionTree } from './decisionTree';
import type { KnowflowDoc } from '../types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'decisionTree', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('decisionTree preset', () => {
  it('accepts a labelled tree', () => {
    const d = doc({
      blocks: [
        { id: 'q', type: 'question', text: 'Student?' },
        { id: 'o1', type: 'outcome', text: 'Re-enable' },
        { id: 'o2', type: 'outcome', text: 'Escalate' },
      ],
      connections: [
        { id: 'e1', from: 'q', to: 'o1', label: 'yes' },
        { id: 'e2', from: 'q', to: 'o2', label: 'no' },
      ],
    });
    expect(decisionTree.validate(d)).toEqual([]);
  });

  it('rejects an unlabelled branch from a question', () => {
    const d = doc({
      blocks: [
        { id: 'q', type: 'question', text: 'Student?' },
        { id: 'o1', type: 'outcome', text: 'Re-enable' },
      ],
      connections: [{ id: 'e1', from: 'q', to: 'o1' }],
    });
    expect(decisionTree.validate(d).some(e => e.code === 'unlabelled-branch')).toBe(true);
  });

  it('rejects a block with two parents (not a tree)', () => {
    const d = doc({
      blocks: [
        { id: 'q1', type: 'question', text: 'A?' },
        { id: 'q2', type: 'question', text: 'B?' },
        { id: 'o', type: 'outcome', text: 'X' },
      ],
      connections: [
        { id: 'e1', from: 'q1', to: 'o', label: 'yes' },
        { id: 'e2', from: 'q2', to: 'o', label: 'yes' },
      ],
    });
    expect(decisionTree.validate(d).some(e => e.code === 'not-a-tree')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './decisionTree'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/presets/decisionTree.ts
import type { KnowflowDoc, BlockType, ValidationError } from '../types';
import type { PresetDef } from './types';
import { bfsOrder } from './flowchart';

const ALLOWED: BlockType[] = ['question', 'outcome'];

function validate(doc: KnowflowDoc): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set(doc.blocks.map(b => b.id));
  const typeById = new Map(doc.blocks.map(b => [b.id, b.type]));

  for (const b of doc.blocks) {
    if (!ALLOWED.includes(b.type)) {
      errors.push({ code: 'illegal-block-type', blockId: b.id, message: `"${b.type}" is not allowed in a decision tree.` });
    }
  }
  for (const c of doc.connections) {
    if (!ids.has(c.from) || !ids.has(c.to)) {
      errors.push({ code: 'dangling-connection', message: `Connection ${c.id} points to a missing block.` });
    }
    if (typeById.get(c.from) === 'question' && !c.label) {
      errors.push({ code: 'unlabelled-branch', message: `A branch from "${typeById.get(c.from)}" has no answer label.` });
    }
  }
  const parents = new Map<string, number>();
  for (const c of doc.connections) parents.set(c.to, (parents.get(c.to) ?? 0) + 1);
  for (const [id, count] of parents) {
    if (count > 1) errors.push({ code: 'not-a-tree', blockId: id, message: 'A block has more than one parent.' });
  }
  return errors;
}

export const decisionTree: PresetDef = {
  id: 'decisionTree',
  name: 'Decision Tree',
  blockTypes: ALLOWED,
  defaultBlockType: 'question',
  validate,
  narrationOrder: bfsOrder,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/presets/decisionTree.ts src/core/presets/decisionTree.test.ts
git commit -m "feat(core): decision-tree preset with tree-shape validation"
```

---

## Task 7: Fishbone preset

**Files:**
- Create: `src/core/presets/fishbone.ts`
- Test: `src/core/presets/fishbone.test.ts`

Rules: block types are `spine | category | cause`; exactly one `spine`; every `cause` has a `categoryId` referencing an existing `category`; the `connections` array is unused (fishbone uses attachment) and must be empty. Narration order: spine first, then each category followed by its causes, in document order.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/presets/fishbone.test.ts
import { describe, it, expect } from 'vitest';
import { fishbone } from './fishbone';
import type { KnowflowDoc } from '../types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'fishbone', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('fishbone preset', () => {
  it('accepts a valid fishbone', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'Account stays disabled' },
        { id: 'cat1', type: 'category', text: 'Students' },
        { id: 'ca1', type: 'cause', text: 'Not enrolled', categoryId: 'cat1' },
      ],
    });
    expect(fishbone.validate(d)).toEqual([]);
  });

  it('requires exactly one spine', () => {
    const d = doc({ blocks: [{ id: 'cat', type: 'category', text: 'X' }] });
    expect(fishbone.validate(d).some(e => e.code === 'spine-count')).toBe(true);
  });

  it('rejects a cause without a valid category', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'E' },
        { id: 'ca', type: 'cause', text: 'orphan', categoryId: 'ghost' },
      ],
    });
    expect(fishbone.validate(d).some(e => e.code === 'orphan-cause')).toBe(true);
  });

  it('rejects connections (fishbone uses attachment)', () => {
    const d = doc({
      blocks: [{ id: 's', type: 'spine', text: 'E' }],
      connections: [{ id: 'e', from: 's', to: 's' }],
    });
    expect(fishbone.validate(d).some(e => e.code === 'unexpected-connections')).toBe(true);
  });

  it('narrates spine, then each category with its causes', () => {
    const d = doc({
      blocks: [
        { id: 's', type: 'spine', text: 'E' },
        { id: 'cat1', type: 'category', text: 'Students' },
        { id: 'ca1', type: 'cause', text: 'Not enrolled', categoryId: 'cat1' },
        { id: 'cat2', type: 'category', text: 'Staff' },
      ],
    });
    expect(fishbone.narrationOrder(d).map(b => b.id)).toEqual(['s', 'cat1', 'ca1', 'cat2']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './fishbone'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/presets/fishbone.ts
import type { KnowflowDoc, Block, BlockType, ValidationError } from '../types';
import type { PresetDef } from './types';

const ALLOWED: BlockType[] = ['spine', 'category', 'cause'];

function validate(doc: KnowflowDoc): ValidationError[] {
  const errors: ValidationError[] = [];
  const categoryIds = new Set(doc.blocks.filter(b => b.type === 'category').map(b => b.id));

  for (const b of doc.blocks) {
    if (!ALLOWED.includes(b.type)) {
      errors.push({ code: 'illegal-block-type', blockId: b.id, message: `"${b.type}" is not allowed in a fishbone.` });
    }
  }
  const spineCount = doc.blocks.filter(b => b.type === 'spine').length;
  if (spineCount !== 1) {
    errors.push({ code: 'spine-count', message: `A fishbone needs exactly one effect (spine); found ${spineCount}.` });
  }
  for (const b of doc.blocks) {
    if (b.type === 'cause' && (!b.categoryId || !categoryIds.has(b.categoryId))) {
      errors.push({ code: 'orphan-cause', blockId: b.id, message: `Cause "${b.text}" is not attached to a category.` });
    }
  }
  if (doc.connections.length > 0) {
    errors.push({ code: 'unexpected-connections', message: 'Fishbone diagrams use category attachment, not connections.' });
  }
  return errors;
}

function narrationOrder(doc: KnowflowDoc): Block[] {
  const ordered: Block[] = [];
  const spine = doc.blocks.find(b => b.type === 'spine');
  if (spine) ordered.push(spine);
  for (const cat of doc.blocks.filter(b => b.type === 'category')) {
    ordered.push(cat);
    ordered.push(...doc.blocks.filter(b => b.type === 'cause' && b.categoryId === cat.id));
  }
  return ordered;
}

export const fishbone: PresetDef = {
  id: 'fishbone',
  name: 'Fishbone',
  blockTypes: ALLOWED,
  defaultBlockType: 'category',
  validate,
  narrationOrder,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/presets/fishbone.ts src/core/presets/fishbone.test.ts
git commit -m "feat(core): fishbone preset with attachment validation"
```

---

## Task 8: Step-list preset

**Files:**
- Create: `src/core/presets/stepList.ts`
- Test: `src/core/presets/stepList.test.ts`

Rules: block types are `step | note | warning`; the `connections` array must be empty (order is the sequence). Narration order is document order.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/presets/stepList.test.ts
import { describe, it, expect } from 'vitest';
import { stepList } from './stepList';
import type { KnowflowDoc } from '../types';

function doc(partial: Partial<KnowflowDoc>): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'stepList', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    ...partial,
  };
}

describe('stepList preset', () => {
  it('accepts a sequence of steps, notes, warnings', () => {
    const d = doc({
      blocks: [
        { id: '1', type: 'step', text: 'Open console' },
        { id: '2', type: 'warning', text: 'Double-check the user' },
        { id: '3', type: 'step', text: 'Reset password' },
      ],
    });
    expect(stepList.validate(d)).toEqual([]);
  });

  it('rejects a foreign block type', () => {
    const d = doc({ blocks: [{ id: '1', type: 'decision', text: 'x' }] });
    expect(stepList.validate(d).some(e => e.code === 'illegal-block-type')).toBe(true);
  });

  it('rejects connections', () => {
    const d = doc({
      blocks: [{ id: '1', type: 'step', text: 'x' }],
      connections: [{ id: 'e', from: '1', to: '1' }],
    });
    expect(stepList.validate(d).some(e => e.code === 'unexpected-connections')).toBe(true);
  });

  it('narrates in document order', () => {
    const d = doc({
      blocks: [
        { id: '1', type: 'step', text: 'A' },
        { id: '2', type: 'step', text: 'B' },
      ],
    });
    expect(stepList.narrationOrder(d).map(b => b.id)).toEqual(['1', '2']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './stepList'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/presets/stepList.ts
import type { KnowflowDoc, BlockType, ValidationError } from '../types';
import type { PresetDef } from './types';

const ALLOWED: BlockType[] = ['step', 'note', 'warning'];

function validate(doc: KnowflowDoc): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const b of doc.blocks) {
    if (!ALLOWED.includes(b.type)) {
      errors.push({ code: 'illegal-block-type', blockId: b.id, message: `"${b.type}" is not allowed in a step list.` });
    }
  }
  if (doc.connections.length > 0) {
    errors.push({ code: 'unexpected-connections', message: 'Step lists are linear; the block order is the sequence.' });
  }
  return errors;
}

export const stepList: PresetDef = {
  id: 'stepList',
  name: 'Step List',
  blockTypes: ALLOWED,
  defaultBlockType: 'step',
  validate,
  narrationOrder: (doc) => [...doc.blocks],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/presets/stepList.ts src/core/presets/stepList.test.ts
git commit -m "feat(core): step-list preset"
```

---

## Task 9: Preset registry

**Files:**
- Create: `src/core/presets/index.ts`
- Test: `src/core/presets/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/presets/index.test.ts
import { describe, it, expect } from 'vitest';
import { getPreset, PRESETS } from './index';
import { ALL_PRESETS } from '../types';

describe('preset registry', () => {
  it('has a def for every preset', () => {
    for (const id of ALL_PRESETS) {
      expect(getPreset(id).id).toBe(id);
    }
  });

  it('exposes presets as an array for UI menus', () => {
    expect(PRESETS.map(p => p.id).sort()).toEqual([...ALL_PRESETS].sort());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/presets/index.ts
import type { Preset } from '../types';
import type { PresetDef } from './types';
import { flowchart } from './flowchart';
import { decisionTree } from './decisionTree';
import { fishbone } from './fishbone';
import { stepList } from './stepList';

const REGISTRY: Record<Preset, PresetDef> = {
  flowchart,
  decisionTree,
  fishbone,
  stepList,
};

export const PRESETS: PresetDef[] = Object.values(REGISTRY);

export function getPreset(id: Preset): PresetDef {
  return REGISTRY[id];
}

export type { PresetDef } from './types';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/presets/index.ts src/core/presets/index.test.ts
git commit -m "feat(core): preset registry"
```

---

## Task 10: Edit operations

**Files:**
- Create: `src/core/operations.ts`
- Test: `src/core/operations.test.ts`

All operations are pure: they return a new `KnowflowDoc` and never mutate the input. Each bumps `meta.updatedAt` via the injected clock. The default block type for `addBlock` comes from the preset registry.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/operations.test.ts
import { describe, it, expect } from 'vitest';
import {
  addBlock, updateBlockText, swapBlockType, deleteBlock,
  addConnection, removeConnection, retargetConnection,
  recategorizeCause, reorderBlock,
} from './operations';
import { createDoc } from './createDoc';
import type { Clock } from './ids';

function fixedClock(): Clock {
  let n = 0;
  return { newId: () => `id${++n}`, nowIso: () => '2026-06-12T12:00:00.000Z' };
}

describe('operations', () => {
  it('addBlock appends a block of the preset default type and does not mutate input', () => {
    const clock = fixedClock();
    const d0 = createDoc('flowchart', 'T', clock);
    const { doc: d1, blockId } = addBlock(d0, 'New step', undefined, clock);
    expect(d0.blocks).toHaveLength(0);          // input untouched
    expect(d1.blocks).toHaveLength(1);
    expect(d1.blocks[0].type).toBe('step');     // flowchart default
    expect(d1.blocks[0].id).toBe(blockId);
    expect(d1.meta.updatedAt).toBe('2026-06-12T12:00:00.000Z');
  });

  it('addBlock honours an explicit type', () => {
    const clock = fixedClock();
    const d0 = createDoc('flowchart', 'T', clock);
    const { doc } = addBlock(d0, 'Q', 'decision', clock);
    expect(doc.blocks[0].type).toBe('decision');
  });

  it('updateBlockText changes only the target', () => {
    const clock = fixedClock();
    let d = createDoc('stepList', 'T', clock);
    d = addBlock(d, 'A', undefined, clock).doc;
    const id = d.blocks[0].id;
    d = updateBlockText(d, id, 'B', clock);
    expect(d.blocks[0].text).toBe('B');
  });

  it('swapBlockType changes a block type', () => {
    const clock = fixedClock();
    let d = createDoc('flowchart', 'T', clock);
    const id = addBlock(d, 'A', 'step', clock).doc.blocks[0].id;
    d = addBlock(d, 'A', 'step', clock).doc;
    d = swapBlockType(d, d.blocks[0].id, 'decision', clock);
    expect(d.blocks[0].type).toBe('decision');
  });

  it('deleteBlock removes the block and any touching connections', () => {
    const clock = fixedClock();
    let d = createDoc('flowchart', 'T', clock);
    d = addBlock(d, 'A', 'step', clock).doc;
    d = addBlock(d, 'B', 'outcome', clock).doc;
    const [a, b] = d.blocks.map(x => x.id);
    d = addConnection(d, a, b, undefined, clock).doc;
    d = deleteBlock(d, a, clock);
    expect(d.blocks.map(x => x.id)).toEqual([b]);
    expect(d.connections).toHaveLength(0);
  });

  it('addConnection / removeConnection / retargetConnection', () => {
    const clock = fixedClock();
    let d = createDoc('flowchart', 'T', clock);
    d = addBlock(d, 'A', 'step', clock).doc;
    d = addBlock(d, 'B', 'outcome', clock).doc;
    d = addBlock(d, 'C', 'outcome', clock).doc;
    const [a, b, c] = d.blocks.map(x => x.id);
    let res = addConnection(d, a, b, 'yes', clock);
    d = res.doc;
    const connId = res.connectionId;
    expect(d.connections[0]).toMatchObject({ from: a, to: b, label: 'yes' });
    d = retargetConnection(d, connId, c, clock);
    expect(d.connections[0].to).toBe(c);
    d = removeConnection(d, connId, clock);
    expect(d.connections).toHaveLength(0);
  });

  it('recategorizeCause moves a cause to another category', () => {
    const clock = fixedClock();
    let d = createDoc('fishbone', 'Effect', clock);
    d = addBlock(d, 'Students', 'category', clock).doc;
    d = addBlock(d, 'Staff', 'category', clock).doc;
    const cats = d.blocks.filter(b => b.type === 'category').map(b => b.id);
    d = addBlock(d, 'A cause', 'cause', clock).doc;
    const causeId = d.blocks.find(b => b.type === 'cause')!.id;
    d = recategorizeCause(d, causeId, cats[0], clock);
    expect(d.blocks.find(b => b.id === causeId)!.categoryId).toBe(cats[0]);
    d = recategorizeCause(d, causeId, cats[1], clock);
    expect(d.blocks.find(b => b.id === causeId)!.categoryId).toBe(cats[1]);
  });

  it('reorderBlock moves a block to a new index', () => {
    const clock = fixedClock();
    let d = createDoc('stepList', 'T', clock);
    d = addBlock(d, 'A', undefined, clock).doc;
    d = addBlock(d, 'B', undefined, clock).doc;
    d = addBlock(d, 'C', undefined, clock).doc;
    const ids = d.blocks.map(b => b.id);
    d = reorderBlock(d, ids[2], 0, clock);
    expect(d.blocks.map(b => b.text)).toEqual(['C', 'A', 'B']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './operations'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/operations.ts
import type { KnowflowDoc, Block, BlockType } from './types';
import { systemClock, type Clock } from './ids';
import { getPreset } from './presets';

function touch(doc: KnowflowDoc, clock: Clock): KnowflowDoc {
  return { ...doc, meta: { ...doc.meta, updatedAt: clock.nowIso() } };
}

export function addBlock(
  doc: KnowflowDoc,
  text: string,
  type?: BlockType,
  clock: Clock = systemClock,
): { doc: KnowflowDoc; blockId: string } {
  const blockType = type ?? getPreset(doc.preset).defaultBlockType;
  const block: Block = { id: clock.newId(), type: blockType, text };
  const next = touch({ ...doc, blocks: [...doc.blocks, block] }, clock);
  return { doc: next, blockId: block.id };
}

export function updateBlockText(doc: KnowflowDoc, blockId: string, text: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(b => (b.id === blockId ? { ...b, text } : b)) }, clock);
}

export function swapBlockType(doc: KnowflowDoc, blockId: string, type: BlockType, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(b => (b.id === blockId ? { ...b, type } : b)) }, clock);
}

export function deleteBlock(doc: KnowflowDoc, blockId: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({
    ...doc,
    blocks: doc.blocks.filter(b => b.id !== blockId),
    connections: doc.connections.filter(c => c.from !== blockId && c.to !== blockId),
  }, clock);
}

export function addConnection(
  doc: KnowflowDoc,
  from: string,
  to: string,
  label?: string,
  clock: Clock = systemClock,
): { doc: KnowflowDoc; connectionId: string } {
  const id = clock.newId();
  const next = touch({ ...doc, connections: [...doc.connections, { id, from, to, label }] }, clock);
  return { doc: next, connectionId: id };
}

export function removeConnection(doc: KnowflowDoc, connectionId: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, connections: doc.connections.filter(c => c.id !== connectionId) }, clock);
}

export function retargetConnection(doc: KnowflowDoc, connectionId: string, newTo: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, connections: doc.connections.map(c => (c.id === connectionId ? { ...c, to: newTo } : c)) }, clock);
}

export function recategorizeCause(doc: KnowflowDoc, blockId: string, categoryId: string, clock: Clock = systemClock): KnowflowDoc {
  return touch({ ...doc, blocks: doc.blocks.map(b => (b.id === blockId ? { ...b, categoryId } : b)) }, clock);
}

export function reorderBlock(doc: KnowflowDoc, blockId: string, newIndex: number, clock: Clock = systemClock): KnowflowDoc {
  const blocks = [...doc.blocks];
  const from = blocks.findIndex(b => b.id === blockId);
  if (from === -1) return doc;
  const [moved] = blocks.splice(from, 1);
  blocks.splice(newIndex, 0, moved);
  return touch({ ...doc, blocks }, clock);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/operations.ts src/core/operations.test.ts
git commit -m "feat(core): immutable edit operations"
```

---

## Task 11: JSON serialize / import

**Files:**
- Create: `src/core/serialize.ts`
- Test: `src/core/serialize.test.ts`

`exportJson` produces a stable, pretty-printed string. `importJson` parses, checks the shape and preset validity, and returns either the document or a list of errors — never throws on bad input.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/serialize.test.ts
import { describe, it, expect } from 'vitest';
import { exportJson, importJson } from './serialize';
import { createDoc } from './createDoc';
import { addBlock } from './operations';
import type { Clock } from './ids';

const clock: Clock = { newId: (() => { let n = 0; return () => `id${++n}`; })(), nowIso: () => '2026-06-12T00:00:00.000Z' };

describe('serialize', () => {
  it('round-trips a document', () => {
    let d = createDoc('flowchart', 'Round trip', clock);
    d = addBlock(d, 'Start', 'step', clock).doc;
    const json = exportJson(d);
    const result = importJson(json);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc).toEqual(d);
  });

  it('rejects non-JSON input', () => {
    const result = importJson('not json {');
    expect(result.ok).toBe(false);
  });

  it('rejects a document with an unknown preset', () => {
    const result = importJson(JSON.stringify({ id: 'x', title: 'T', preset: 'mindmap', blocks: [], connections: [], meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 } }));
    expect(result.ok).toBe(false);
  });

  it('rejects a document that fails preset validation', () => {
    // fishbone with no spine
    const result = importJson(JSON.stringify({ id: 'x', title: 'T', preset: 'fishbone', blocks: [], connections: [], meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some(e => e.code === 'spine-count')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './serialize'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/serialize.ts
import type { KnowflowDoc, ValidationError } from './types';
import { ALL_PRESETS } from './types';
import { getPreset } from './presets';

export function exportJson(doc: KnowflowDoc): string {
  return JSON.stringify(doc, null, 2);
}

export type ImportResult =
  | { ok: true; doc: KnowflowDoc }
  | { ok: false; errors: ValidationError[] };

export function importJson(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: [{ code: 'invalid-json', message: 'The file is not valid JSON.' }] };
  }

  const shapeErrors = checkShape(parsed);
  if (shapeErrors.length) return { ok: false, errors: shapeErrors };

  const doc = parsed as KnowflowDoc;
  const presetErrors = getPreset(doc.preset).validate(doc);
  if (presetErrors.length) return { ok: false, errors: presetErrors };

  return { ok: true, doc };
}

function checkShape(value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof value !== 'object' || value === null) {
    return [{ code: 'invalid-shape', message: 'Expected a document object.' }];
  }
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string') errors.push({ code: 'invalid-shape', message: 'Missing "id".' });
  if (typeof v.title !== 'string') errors.push({ code: 'invalid-shape', message: 'Missing "title".' });
  if (!ALL_PRESETS.includes(v.preset as never)) errors.push({ code: 'unknown-preset', message: `Unknown preset "${String(v.preset)}".` });
  if (!Array.isArray(v.blocks)) errors.push({ code: 'invalid-shape', message: '"blocks" must be an array.' });
  if (!Array.isArray(v.connections)) errors.push({ code: 'invalid-shape', message: '"connections" must be an array.' });
  if (typeof v.meta !== 'object' || v.meta === null) errors.push({ code: 'invalid-shape', message: 'Missing "meta".' });
  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/serialize.ts src/core/serialize.test.ts
git commit -m "feat(core): JSON export and validating import"
```

---

## Task 12: Browser persistence repository

**Files:**
- Create: `src/core/persistence.ts`
- Test: `src/core/persistence.test.ts`

A thin repository over a `Storage` interface (so tests inject a fake and production passes `localStorage`). Stores a map of `id → document` under one key. Slice 3 swaps this for Supabase behind the same method names.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/persistence.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentStore } from './persistence';
import { createDoc } from './createDoc';
import type { Clock } from './ids';

class FakeStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

const clock: Clock = { newId: (() => { let n = 0; return () => `id${++n}`; })(), nowIso: () => '2026-06-12T00:00:00.000Z' };

describe('DocumentStore', () => {
  let store: DocumentStore;
  beforeEach(() => { store = new DocumentStore(new FakeStorage()); });

  it('saves and loads a document by id', () => {
    const d = createDoc('flowchart', 'A', clock);
    store.save(d);
    expect(store.load(d.id)).toEqual(d);
  });

  it('lists saved documents as summaries', () => {
    store.save(createDoc('flowchart', 'A', clock));
    store.save(createDoc('fishbone', 'B', clock));
    const list = store.list();
    expect(list).toHaveLength(2);
    expect(list[0]).toHaveProperty('title');
    expect(list[0]).toHaveProperty('preset');
  });

  it('returns null for a missing id', () => {
    expect(store.load('nope')).toBeNull();
  });

  it('removes a document', () => {
    const d = createDoc('flowchart', 'A', clock);
    store.save(d);
    store.remove(d.id);
    expect(store.load(d.id)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './persistence'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/persistence.ts
import type { KnowflowDoc, Preset } from './types';

/** Minimal slice of the Web Storage API we depend on. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DocSummary {
  id: string;
  title: string;
  preset: Preset;
  status: 'draft' | 'official';
  updatedAt: string;
}

const KEY = 'knowflow.documents.v1';

export class DocumentStore {
  constructor(private storage: KeyValueStorage) {}

  private readAll(): Record<string, KnowflowDoc> {
    const raw = this.storage.getItem(KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, KnowflowDoc>;
    } catch {
      return {};
    }
  }

  private writeAll(map: Record<string, KnowflowDoc>): void {
    this.storage.setItem(KEY, JSON.stringify(map));
  }

  save(doc: KnowflowDoc): void {
    const map = this.readAll();
    map[doc.id] = doc;
    this.writeAll(map);
  }

  load(id: string): KnowflowDoc | null {
    return this.readAll()[id] ?? null;
  }

  remove(id: string): void {
    const map = this.readAll();
    delete map[id];
    this.writeAll(map);
  }

  list(): DocSummary[] {
    return Object.values(this.readAll()).map(d => ({
      id: d.id, title: d.title, preset: d.preset, status: d.meta.status, updatedAt: d.meta.updatedAt,
    }));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/persistence.ts src/core/persistence.test.ts
git commit -m "feat(core): localStorage-backed document store"
```

---

## Task 13: Barrel export + full suite green

**Files:**
- Create: `src/core/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
// src/core/index.ts
export * from './types';
export * from './ids';
export * from './createDoc';
export * from './operations';
export * from './serialize';
export * from './persistence';
export { getPreset, PRESETS } from './presets';
export type { PresetDef } from './presets';
```

- [ ] **Step 2: Run the whole suite**

Run: `npm test`
Expected: PASS — all test files green.

- [ ] **Step 3: Typecheck the project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/core/index.ts
git commit -m "feat(core): public barrel for the document core"
```

---

## Self-Review (completed by plan author)

**Spec coverage (Slice 1 scope of `2026-06-11-knowflow-design.md`):**
- Document model with `status`/`version` carried for later slices — Task 1 ✓ (`DocMeta`).
- Per-preset vocabularies — Tasks 5–8 ✓ (flowchart, decisionTree, fishbone, stepList).
- Preset as validator/layout-authority (validation half here; layout is Plan 2) — Tasks 5–8 ✓.
- Edit-within-preset: add/delete/edit text/swap type/retarget/recategorize/reorder — Task 10 ✓.
- JSON import/export — Task 11 ✓.
- Browser-storage persistence — Task 12 ✓.
- Accessible-view *data* (narration order per preset) — Tasks 5–8 ✓; the rendering is Plan 3.
- Out of scope here and correctly deferred: React Flow canvas + auto-layout (Plan 2), narrative/export UI (Plan 3), AI drafting (Slice 2), shared library/approval (Slice 3).

**Placeholder scan:** No TBD/TODO; every code step has complete code; every test has real assertions. ✓

**Type consistency:** `Clock` (`{ newId, nowIso }`) is defined in Task 2 and used identically in Tasks 3, 10, 11, 12. `addBlock`/`addConnection` return `{ doc, blockId }` / `{ doc, connectionId }` consistently across Task 10 definition and its tests. `bfsOrder` defined in Task 5 is imported by Task 6. `getPreset`/`PRESETS` defined in Task 9 used in Tasks 10–11. `KeyValueStorage` matches the fake in the Task 12 test. ✓
