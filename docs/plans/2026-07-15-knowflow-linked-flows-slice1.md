# Linked Flows — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix knowflow's barren cold-start by shipping four curated, interlinked "starter" flows that load with no backend, and letting a node link to another whole flow you can follow and Back out of.

**Architecture:** A node becomes a "door" via an additive `Block.linkTo` (target flow id). Curated flows ship as data in `src/library/`; a thin `flows.ts` resolver merges them with the stored library so both list and both resolve by id. `EditorScreen` gains a Back-history stack; following a door swaps the canvas and Back returns. Starter flows (id prefix `starter:`) render read-only. Every existing flow stays a normal `KnowflowDoc`, so renderers/exporters/validators are untouched.

**Tech Stack:** React 19 + TypeScript, `@xyflow/react` v12 (React Flow), Vitest (node env), Vite.

**Design spec:** `docs/specs/2026-07-14-knowflow-linked-flows-design.md` (flow structures in Appendix A).

## Global Constraints

- `Block.linkTo` is **additive and optional** — no existing field changes; type-only where possible.
- Starter flow ids **must** use the `starter:` prefix; nothing else may use it.
- Starter flows are **read-only**: never saved, never deleted.
- Following a link whose target does not resolve is a **safe no-op** — never throws, never blank-screens.
- Test env is **node** (no DOM). Logic is unit-tested with Vitest; UI is verified by driving the running app.
- Green bar every task: `npm test` passes, `npm run build` (`tsc -b && vite build`) clean. The existing suite (77 tests) must stay green.
- Match existing style: functional `setDoc` updates, `useCallback` for canvas callbacks (see the React #185 note in `DiagramCanvas.tsx`), `.js` extensions on runtime relative imports in `src/core` (ESM), type-only imports left extensionless.

---

## File Structure

**Create:**
- `src/library/flows/verification.ts` — the `starter:verification` `KnowflowDoc`.
- `src/library/flows/resetPassword.ts` — the `starter:reset-password` `KnowflowDoc`.
- `src/library/flows/twoFactor.ts` — the `starter:2fa` `KnowflowDoc`.
- `src/library/flows/setNo2faOu.ts` — the `starter:set-no2fa-ou` `KnowflowDoc`.
- `src/library/starterFlows.ts` — aggregates the four into `STARTER_FLOWS`.
- `src/library/starterFlows.test.ts` — structural + link-resolution validity of all starters.
- `src/library/flows.ts` — resolver: `isStarter`, `resolveFlow`, `listFlows`, `FlowSummary`.
- `src/library/flows.test.ts` — resolver behavior (with `../data/library` mocked).

**Modify:**
- `src/core/types.ts` — add `linkTo?: string` to `Block`.
- `src/core/serialize.test.ts` — round-trip test for `linkTo` (or `src/core/persistence.test.ts`).
- `src/canvas/adapter.ts` — carry `linkTo` + `onFollow` into `KnowflowNodeData`.
- `src/canvas/KnowflowNode.tsx` + `src/canvas/KnowflowNode.css` — door affordance.
- `src/canvas/DiagramCanvas.tsx` — thread an `onFollow` prop into node data.
- `src/editor/DiagramsPanel.tsx` + `src/editor/DiagramsPanel.css` — group Starter vs Your flows.
- `src/editor/EditorScreen.tsx` — history stack, follow/back, boot from starters, read-only mode, Back button, wire `onFollow`.

---

## Task 1: `Block.linkTo` field + serialization round-trip

**Files:**
- Modify: `src/core/types.ts:12-22`
- Test: `src/core/serialize.test.ts`

**Interfaces:**
- Produces: `Block.linkTo?: string` — read by the adapter (Task 6), starter flows (Task 2), and navigation (Task 5).

- [ ] **Step 1: Write the failing test**

Add to `src/core/serialize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { exportJson, importJson } from './serialize';
import type { KnowflowDoc } from './types';

describe('linkTo round-trips', () => {
  it('preserves a block linkTo through export → import', () => {
    const doc: KnowflowDoc = {
      id: 'd1', title: 'T', preset: 'flowchart',
      blocks: [{ id: 'b1', type: 'step', text: 'go', linkTo: 'starter:2fa' }],
      connections: [],
      meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version: 1 },
    };
    const result = importJson(exportJson(doc));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc.blocks[0].linkTo).toBe('starter:2fa');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/serialize.test.ts -t "linkTo round-trips"`
Expected: FAIL — `linkTo` is `undefined` (property not on the `Block` type / stripped).

- [ ] **Step 3: Add the field**

In `src/core/types.ts`, inside `interface Block`, after the `size?` line:

```ts
  /** Manual size override. Absent → shape default. */
  size?: { w: number; h: number };
  /** Link/"door": id of another KnowflowDoc this node opens. Absent → normal node. */
  linkTo?: string;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/serialize.test.ts -t "linkTo round-trips"`
Expected: PASS

- [ ] **Step 5: Full suite + build, then commit**

Run: `npm test && npm run build`
Expected: all green.

```bash
git add src/core/types.ts src/core/serialize.test.ts
git commit -m "feat(core): add optional Block.linkTo (flow-to-flow link)"
```

---

## Task 2: The four starter flows + validity test

**Files:**
- Create: `src/library/flows/verification.ts`, `resetPassword.ts`, `twoFactor.ts`, `setNo2faOu.ts`
- Create: `src/library/starterFlows.ts`
- Test: `src/library/starterFlows.test.ts`

**Interfaces:**
- Produces: `STARTER_FLOWS: KnowflowDoc[]` (from `src/library/starterFlows.ts`) — consumed by the resolver (Task 3).
- Each flow's structure is Appendix A of the design spec. Content strings must match the spec verbatim.

**Convention for these modules:** hand-authored `KnowflowDoc`s. Block ids are readable and unique *within a doc*. No `position` (auto-layout places them). `meta` is fixed/deterministic. Runtime imports from `../../core` use `.js`.

- [ ] **Step 1: Write the failing test**

Create `src/library/starterFlows.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { STARTER_FLOWS } from './starterFlows';
import { getPreset } from '../core/presets';

const ids = new Set(STARTER_FLOWS.map(f => f.id));

describe('starter flows', () => {
  it('has the four expected flows, all starter: prefixed', () => {
    expect([...ids].sort()).toEqual(
      ['starter:2fa', 'starter:reset-password', 'starter:set-no2fa-ou', 'starter:verification'],
    );
    for (const f of STARTER_FLOWS) expect(f.id.startsWith('starter:')).toBe(true);
  });

  it('each flow validates clean against its preset', () => {
    for (const f of STARTER_FLOWS) {
      expect(getPreset(f.preset).validate(f), `${f.id} should validate`).toEqual([]);
    }
  });

  it('every block id is unique within its flow', () => {
    for (const f of STARTER_FLOWS) {
      const bids = f.blocks.map(b => b.id);
      expect(new Set(bids).size, `${f.id} has duplicate block ids`).toBe(bids.length);
    }
  });

  it('every connection references blocks that exist', () => {
    for (const f of STARTER_FLOWS) {
      const bids = new Set(f.blocks.map(b => b.id));
      for (const c of f.connections) {
        expect(bids.has(c.from), `${f.id} conn ${c.id} bad from`).toBe(true);
        expect(bids.has(c.to), `${f.id} conn ${c.id} bad to`).toBe(true);
      }
    }
  });

  it('every linkTo resolves to a starter flow', () => {
    for (const f of STARTER_FLOWS) {
      for (const b of f.blocks) {
        if (b.linkTo) expect(ids.has(b.linkTo), `${f.id}/${b.id} → ${b.linkTo}`).toBe(true);
      }
    }
  });

  it('has at least one door (linkTo) across the set', () => {
    const doors = STARTER_FLOWS.flatMap(f => f.blocks).filter(b => b.linkTo);
    expect(doors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/library/starterFlows.test.ts`
Expected: FAIL — cannot resolve `./starterFlows`.

- [ ] **Step 3: Create the four flow modules**

`src/library/flows/setNo2faOu.ts`:

```ts
import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-15T00:00:00.000Z';

export const setNo2faOu: KnowflowDoc = {
  id: 'starter:set-no2fa-ou',
  title: 'Set OU to No2FA',
  description: 'Reusable: move the user into the No2FA org unit so 2-Step can be changed.',
  preset: 'flowchart',
  blocks: [
    { id: 'o-note', type: 'step', text: 'Note the original Org Unit (OU)' },
    { id: 'o-change', type: 'step', text: 'Change OU to: aps.edu › Staff › GoogleNoSync › No2FA' },
    { id: 'o-refresh', type: 'step', text: 'Refresh the page to confirm the OU updated' },
    { id: 'o-done', type: 'outcome', text: 'OU set — return to your flow' },
  ],
  connections: [
    { id: 'oc1', from: 'o-note', to: 'o-change' },
    { id: 'oc2', from: 'o-change', to: 'o-refresh' },
    { id: 'oc3', from: 'o-refresh', to: 'o-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
```

`src/library/flows/verification.ts`:

```ts
import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-15T00:00:00.000Z';

export const verification: KnowflowDoc = {
  id: 'starter:verification',
  title: 'Verification',
  description: 'Reusable: confirm who the caller is before making account changes.',
  preset: 'flowchart',
  blocks: [
    { id: 'v-q1', type: 'decision', text: 'Staff, or Student / Parent?' },
    { id: 'v-staff', type: 'step', text: 'Get name and eNumber (ID), plus ONE of: Department / Location, or previous ticket info' },
    { id: 'v-sp', type: 'step', text: 'Get student ID and student name' },
    { id: 'v-q2', type: 'decision', text: 'Who is actually on the call?' },
    { id: 'v-student', type: 'step', text: 'Get school and grade' },
    { id: 'v-parent', type: 'step', text: 'Get parent name, email, home address (also ask school and grade)' },
    { id: 'v-sfs', type: 'step', text: 'Also verify them as Staff' },
    { id: 'v-gate', type: 'decision', text: 'Could the customer provide the required info?' },
    { id: 'v-ok', type: 'outcome', text: 'Identity verified — return to your flow' },
    { id: 'v-inperson', type: 'decision', text: 'Can the customer visit Tech Oasis in person?' },
    { id: 'v-oasis', type: 'outcome', text: 'Refer out to Tech Oasis (customer goes there in person)' },
    { id: 'v-field', type: 'outcome', text: 'Refer out to a field tech (tech visits the customer)' },
    { id: 'v-callback', type: 'outcome', text: 'Customer gathers info and calls back later (or gives up)' },
  ],
  connections: [
    { id: 'vc1', from: 'v-q1', to: 'v-staff', label: 'Staff' },
    { id: 'vc2', from: 'v-q1', to: 'v-sp', label: 'Student / Parent' },
    { id: 'vc3', from: 'v-staff', to: 'v-gate' },
    { id: 'vc4', from: 'v-sp', to: 'v-q2' },
    { id: 'vc5', from: 'v-q2', to: 'v-student', label: 'Student' },
    { id: 'vc6', from: 'v-q2', to: 'v-parent', label: 'Parent' },
    { id: 'vc7', from: 'v-q2', to: 'v-sfs', label: 'Staff for a student' },
    { id: 'vc8', from: 'v-sfs', to: 'v-staff' },
    { id: 'vc9', from: 'v-student', to: 'v-gate' },
    { id: 'vc10', from: 'v-parent', to: 'v-gate' },
    { id: 'vc11', from: 'v-gate', to: 'v-ok', label: 'Yes' },
    { id: 'vc12', from: 'v-gate', to: 'v-inperson', label: 'No — verify in person' },
    { id: 'vc13', from: 'v-gate', to: 'v-callback', label: 'No — will follow up' },
    { id: 'vc14', from: 'v-inperson', to: 'v-oasis', label: 'Yes' },
    { id: 'vc15', from: 'v-inperson', to: 'v-field', label: 'No' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
```

`src/library/flows/resetPassword.ts`:

```ts
import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-15T00:00:00.000Z';

export const resetPassword: KnowflowDoc = {
  id: 'starter:reset-password',
  title: 'Reset Password',
  description: 'Reset a customer password and walk them through setting their own.',
  preset: 'flowchart',
  blocks: [
    { id: 'r-verify', type: 'step', text: 'Verify caller identity', linkTo: 'starter:verification' },
    { id: 'r-temp', type: 'step', text: 'Reset to the monthly default (temporary) password at directory.aps.edu/rDirectory' },
    { id: 'r-pw', type: 'step', text: "Customer opens pwreset.aps.edu and clicks 'Change my password'" },
    { id: 'r-captcha', type: 'step', text: '1 · CAPTCHA (word on desktop / math on mobile)' },
    { id: 'r-login', type: 'step', text: '2 · Log in (username + temporary password)' },
    { id: 'r-setpw', type: 'step', text: '3 · Set new password (meets requirements; no personal info; not a reused password)' },
    { id: 'r-submit', type: 'decision', text: 'Submit' },
    { id: 'r-done', type: 'outcome', text: 'Password has been changed (confirmation message)' },
    { id: 'r-perm', type: 'step', text: "Set a PERMANENT password directly in rDirectory (skip pwreset; UNCHECK 'Change password upon next login')" },
  ],
  connections: [
    { id: 'rc1', from: 'r-verify', to: 'r-temp' },
    { id: 'rc2', from: 'r-temp', to: 'r-pw' },
    { id: 'rc3', from: 'r-pw', to: 'r-captcha' },
    { id: 'rc4', from: 'r-captcha', to: 'r-login' },
    { id: 'rc5', from: 'r-login', to: 'r-setpw' },
    { id: 'rc6', from: 'r-setpw', to: 'r-submit' },
    { id: 'rc7', from: 'r-submit', to: 'r-done', label: 'Success' },
    { id: 'rc8', from: 'r-submit', to: 'r-pw', label: 'Failed, first time' },
    { id: 'rc9', from: 'r-submit', to: 'r-perm', label: 'Failed again (2nd+)' },
    { id: 'rc10', from: 'r-perm', to: 'r-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
```

`src/library/flows/twoFactor.ts`:

```ts
import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-15T00:00:00.000Z';

export const twoFactor: KnowflowDoc = {
  id: 'starter:2fa',
  title: '2FA — Google 2-Step',
  description: 'Get a user protected with Google 2-Step Verification (or fix a broken one).',
  preset: 'flowchart',
  blocks: [
    { id: 'f-verify', type: 'step', text: 'Verify caller identity', linkTo: 'starter:verification' },
    { id: 'f-chk', type: 'decision', text: 'Is 2FA OFF or ON? (check in Google Admin)' },
    { id: 'f-newq', type: 'decision', text: 'New employee?' },
    { id: 'f-enroll', type: 'step', text: 'Enroll for 2-Step Verification (first-time login only)' },
    { id: 'f-ou1', type: 'step', text: 'Set OU to No2FA', linkTo: 'starter:set-no2fa-ou' },
    { id: 'f-loginchal', type: 'step', text: 'Turn OFF Login Challenge (~10 min)' },
    { id: 'f-nav', type: 'step', text: 'Profile icon → Manage Google Account → Security → 2-Step Verification (may re-enter password)' },
    { id: 'f-sel', type: 'step', text: "Under 'Second steps' → Phone → add backup phone → Next → Save → (maybe Approve)" },
    { id: 'f-back', type: 'step', text: 'Return (←) to the 2-Step Verification page' },
    { id: 'f-on', type: 'step', text: 'Turn ON 2-Step Verification' },
    { id: 'f-nowprotected', type: 'step', text: "'You are now protected with 2-Step Verification'" },
    { id: 'f-retry', type: 'step', text: 'Restart browser and retry; remote in if you can' },
    { id: 'f-ou2', type: 'step', text: 'Set OU to No2FA', linkTo: 'starter:set-no2fa-ou' },
    { id: 'f-tryoff', type: 'decision', text: 'Google Admin → Security → 2-Step Verification → try to set it OFF (wait a few minutes)' },
    { id: 'f-codes', type: 'step', text: 'Get Backup Verification Codes' },
    { id: 'f-give', type: 'step', text: 'Give the customer one 8-digit backup code' },
    { id: 'f-guide', type: 'step', text: "Guide: 'Try another way' at the prompt → enter the code" },
    { id: 'f-phones', type: 'step', text: "Open the 2-Step Verification page → 'Phones' under Second steps" },
    { id: 'f-addphone', type: 'step', text: 'Add new phone (remove old if needed) → green check' },
    { id: 'f-phoneupdated', type: 'step', text: 'Phone updated' },
    { id: 'f-restore', type: 'step', text: 'Set the OU back to the ORIGINAL (the one you noted at the start)' },
    { id: 'f-final', type: 'outcome', text: 'Done — resolved and OU restored' },
  ],
  connections: [
    { id: 'fc1', from: 'f-verify', to: 'f-chk' },
    { id: 'fc2', from: 'f-chk', to: 'f-newq', label: 'OFF' },
    { id: 'fc3', from: 'f-chk', to: 'f-ou2', label: 'ON' },
    { id: 'fc4', from: 'f-newq', to: 'f-enroll', label: 'Yes' },
    { id: 'fc5', from: 'f-newq', to: 'f-ou1', label: 'No' },
    { id: 'fc6', from: 'f-enroll', to: 'f-sel' },
    { id: 'fc7', from: 'f-ou1', to: 'f-loginchal' },
    { id: 'fc8', from: 'f-loginchal', to: 'f-nav' },
    { id: 'fc9', from: 'f-nav', to: 'f-sel' },
    { id: 'fc10', from: 'f-sel', to: 'f-back' },
    { id: 'fc11', from: 'f-back', to: 'f-on' },
    { id: 'fc12', from: 'f-on', to: 'f-nowprotected', label: 'Confirmed' },
    { id: 'fc13', from: 'f-on', to: 'f-retry', label: 'Not working' },
    { id: 'fc14', from: 'f-retry', to: 'f-nav' },
    { id: 'fc15', from: 'f-nowprotected', to: 'f-restore' },
    { id: 'fc16', from: 'f-ou2', to: 'f-tryoff' },
    { id: 'fc17', from: 'f-tryoff', to: 'f-loginchal', label: 'Can turn OFF' },
    { id: 'fc18', from: 'f-tryoff', to: 'f-codes', label: 'Cannot turn OFF' },
    { id: 'fc19', from: 'f-codes', to: 'f-give' },
    { id: 'fc20', from: 'f-give', to: 'f-guide' },
    { id: 'fc21', from: 'f-guide', to: 'f-phones' },
    { id: 'fc22', from: 'f-phones', to: 'f-addphone' },
    { id: 'fc23', from: 'f-addphone', to: 'f-phoneupdated' },
    { id: 'fc24', from: 'f-phoneupdated', to: 'f-restore' },
    { id: 'fc25', from: 'f-restore', to: 'f-final' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
```

- [ ] **Step 4: Create the aggregate**

`src/library/starterFlows.ts`:

```ts
import type { KnowflowDoc } from '../core/types';
import { resetPassword } from './flows/resetPassword';
import { twoFactor } from './flows/twoFactor';
import { verification } from './flows/verification';
import { setNo2faOu } from './flows/setNo2faOu';

/** Curated flows bundled with the app (present with no backend). Order = display order. */
export const STARTER_FLOWS: KnowflowDoc[] = [resetPassword, twoFactor, verification, setNo2faOu];
```

- [ ] **Step 5: Run the validity test**

Run: `npx vitest run src/library/starterFlows.test.ts`
Expected: PASS (all six cases). If `validate` flags `decision-no-branches` or a dangling connection, fix the offending flow module — the test pinpoints the flow id.

- [ ] **Step 6: Full suite + build, then commit**

Run: `npm test && npm run build`
Expected: all green.

```bash
git add src/library/flows src/library/starterFlows.ts src/library/starterFlows.test.ts
git commit -m "feat(library): bundle four curated starter flows"
```

---

## Task 3: The resolver (`flows.ts`)

**Files:**
- Create: `src/library/flows.ts`
- Test: `src/library/flows.test.ts`

**Interfaces:**
- Consumes: `STARTER_FLOWS` (Task 2), `listDocs`/`getDoc` from `../data/library`.
- Produces:
  - `isStarter(id: string): boolean`
  - `resolveFlow(id: string): Promise<KnowflowDoc | null>`
  - `listFlows(): Promise<FlowSummary[]>`
  - `interface FlowSummary extends DocSummary { starter: boolean }`

- [ ] **Step 1: Write the failing test**

Create `src/library/flows.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DocSummary } from '../core/persistence';

const listDocs = vi.fn<() => Promise<DocSummary[]>>();
const getDoc = vi.fn<(id: string) => Promise<unknown>>();
vi.mock('../data/library', () => ({ listDocs: () => listDocs(), getDoc: (id: string) => getDoc(id) }));

import { isStarter, resolveFlow, listFlows } from './flows';
import { STARTER_FLOWS } from './starterFlows';

beforeEach(() => { listDocs.mockReset(); getDoc.mockReset(); });

describe('isStarter', () => {
  it('is true only for starter: ids', () => {
    expect(isStarter('starter:2fa')).toBe(true);
    expect(isStarter('abc-123')).toBe(false);
  });
});

describe('resolveFlow', () => {
  it('returns a starter flow by id (as a fresh clone, not the shared constant)', async () => {
    const d = await resolveFlow('starter:verification');
    expect(d?.id).toBe('starter:verification');
    expect(d).not.toBe(STARTER_FLOWS.find(f => f.id === 'starter:verification'));
  });

  it('returns null for an unknown starter id without hitting the library', async () => {
    expect(await resolveFlow('starter:nope')).toBeNull();
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('delegates non-starter ids to getDoc', async () => {
    getDoc.mockResolvedValue({ id: 'x' });
    const d = await resolveFlow('x');
    expect(getDoc).toHaveBeenCalledWith('x');
    expect((d as { id: string }).id).toBe('x');
  });
});

describe('listFlows', () => {
  it('lists starters (flagged) followed by stored docs', async () => {
    listDocs.mockResolvedValue([
      { id: 'mine', title: 'Mine', preset: 'flowchart', status: 'draft', updatedAt: 'z' },
    ]);
    const flows = await listFlows();
    const starters = flows.filter(f => f.starter);
    const stored = flows.filter(f => !f.starter);
    expect(starters.map(s => s.id)).toEqual(STARTER_FLOWS.map(s => s.id));
    expect(stored.map(s => s.id)).toEqual(['mine']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/library/flows.test.ts`
Expected: FAIL — cannot resolve `./flows`.

- [ ] **Step 3: Implement the resolver**

Create `src/library/flows.ts`:

```ts
import type { KnowflowDoc } from '../core/types';
import type { DocSummary } from '../core/persistence';
import { listDocs, getDoc } from '../data/library';
import { STARTER_FLOWS } from './starterFlows';

export interface FlowSummary extends DocSummary {
  /** True for bundled, read-only starter flows. */
  starter: boolean;
}

/** Starter (bundled, read-only) flows use this id prefix; nothing else does. */
export function isStarter(id: string): boolean {
  return id.startsWith('starter:');
}

function summarize(d: KnowflowDoc): DocSummary {
  return { id: d.id, title: d.title, preset: d.preset, status: d.meta.status, updatedAt: d.meta.updatedAt };
}

/** A starter flow (by id, as a fresh clone) or a stored library doc. Null if neither. */
export async function resolveFlow(id: string): Promise<KnowflowDoc | null> {
  if (isStarter(id)) {
    const found = STARTER_FLOWS.find(f => f.id === id);
    return found ? structuredClone(found) : null;
  }
  return getDoc(id);
}

/** All flows for the Diagrams panel: bundled starters first, then stored docs. */
export async function listFlows(): Promise<FlowSummary[]> {
  const stored = await listDocs();
  return [
    ...STARTER_FLOWS.map(f => ({ ...summarize(f), starter: true })),
    ...stored.map(s => ({ ...s, starter: false })),
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/library/flows.test.ts`
Expected: PASS

- [ ] **Step 5: Full suite + build, then commit**

Run: `npm test && npm run build`
Expected: all green.

```bash
git add src/library/flows.ts src/library/flows.test.ts
git commit -m "feat(library): flows resolver (starter + stored) with isStarter/resolveFlow/listFlows"
```

---

## Task 4: Diagrams panel — group Starter vs Your flows

**Files:**
- Modify: `src/editor/DiagramsPanel.tsx`
- Modify: `src/editor/DiagramsPanel.css`

**Interfaces:**
- Consumes: `FlowSummary[]` (Task 3) as `docs`. Starter rows (`starter: true`) get a badge and **no** delete button.
- Produces: unchanged `onOpen(id)` / `onNew` / `onGenerate` / `onDelete` callbacks (EditorScreen wires them in Task 5).

*No unit test — verified via the app in Task 7's end-to-end pass. This is a presentational change.*

- [ ] **Step 1: Rewrite the list section**

Replace the body of `src/editor/DiagramsPanel.tsx` with:

```tsx
import type { Preset } from '../core/types';
import { ALL_PRESETS } from '../core/types';
import { getPreset } from '../core/presets';
import type { FlowSummary } from '../library/flows';
import './DiagramsPanel.css';

interface Props {
  docs: FlowSummary[];
  activeId: string;
  onOpen: (id: string) => void;
  onNew: (preset: Preset) => void;
  onGenerate: () => void;
  onDelete: (id: string) => void;
}

export function DiagramsPanel({ docs, activeId, onOpen, onNew, onGenerate, onDelete }: Props) {
  const starters = docs.filter(d => d.starter);
  const mine = docs.filter(d => !d.starter);

  const row = (d: FlowSummary) => (
    <div key={d.id} className={`dp-doc ${d.id === activeId ? 'on' : ''}`} onClick={() => onOpen(d.id)}>
      <div className="dp-doc-main">
        <span className="dp-doc-title">{d.title || '(untitled)'}</span>
        <span className="dp-doc-meta"><span className="dp-chip">{getPreset(d.preset).name}</span></span>
      </div>
      {!d.starter && (
        <button className="dp-del" title="Delete" aria-label="Delete diagram"
          onClick={e => { e.stopPropagation(); onDelete(d.id); }}>×</button>
      )}
    </div>
  );

  return (
    <div className="dp">
      <button className="dp-primary" onClick={onGenerate}>✨ Generate with AI</button>

      <select className="dp-new" value="" aria-label="New blank diagram"
        onChange={e => { if (e.target.value) onNew(e.target.value as Preset); }}>
        <option value="">+ New blank diagram…</option>
        {ALL_PRESETS.map(p => <option key={p} value={p}>{getPreset(p).name}</option>)}
      </select>

      {starters.length > 0 && (
        <>
          <div className="dp-group">Starter flows</div>
          <div className="dp-list">{starters.map(row)}</div>
        </>
      )}

      <div className="dp-group">Your flows</div>
      <div className="dp-list">
        {mine.length === 0 && <p className="dp-empty">No saved diagrams yet.</p>}
        {mine.map(row)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the group-header style**

Append to `src/editor/DiagramsPanel.css`:

```css
.dp-group {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--muted, #978D7C);
  margin: 14px 4px 4px;
}
.dp-group:first-of-type { margin-top: 8px; }
```

- [ ] **Step 3: Build (type-check catches the Props change)**

Run: `npm run build`
Expected: FAIL in `EditorScreen.tsx` — it still passes `DocSummary[]`. That is expected; Task 5 fixes the call site. Confirm the *only* new errors are in `EditorScreen.tsx`.

- [ ] **Step 4: Commit (with Task 5, since the build only goes green together)**

Do **not** commit yet — this task's build depends on Task 5's EditorScreen changes. Proceed to Task 5, then commit both together at the end of Task 5.

---

## Task 5: Navigation — history, follow/back, boot from starters

**Files:**
- Modify: `src/editor/EditorScreen.tsx`

**Interfaces:**
- Consumes: `listFlows`, `resolveFlow`, `isStarter`, `FlowSummary` (Task 3).
- Produces: `follow(targetId)` passed to the canvas as `onFollow` (Task 6); a Back button; boot that opens a starter when the stored library is empty.

- [ ] **Step 1: Swap the library imports + state to the resolver**

In `src/editor/EditorScreen.tsx`:

Change the import on line 10-11 from:

```ts
import type { DocSummary } from '../core/persistence';
import { listDocs, getDoc, saveDoc, removeDoc, ConflictError } from '../data/library';
```

to:

```ts
import { getDoc, saveDoc, removeDoc, ConflictError } from '../data/library';
import { listFlows, resolveFlow, isStarter, type FlowSummary } from '../library/flows';
```

(`getDoc` stays — `takeTheirs` still uses it for conflict resolution; `listDocs`/`DocSummary` are dropped, replaced by `listFlows`/`FlowSummary`.)

Change the `library` state (line 27) to:

```ts
  const [library, setLibrary] = useState<FlowSummary[]>([]);
```

Add a history stack right after it:

```ts
  const [history, setHistory] = useState<string[]>([]);
```

- [ ] **Step 2: Make `upsertSummary` produce a `FlowSummary`**

Replace the `upsertSummary` body (lines 47-52) so the new entry includes `starter: false`:

```ts
  const upsertSummary = useCallback((d: KnowflowDoc) => {
    setLibrary(prev => [
      { id: d.id, title: d.title, preset: d.preset, status: d.meta.status, updatedAt: d.meta.updatedAt, starter: false },
      ...prev.filter(s => s.id !== d.id),
    ]);
  }, []);
```

- [ ] **Step 3: Guard `save` against starters (read-only)**

Replace the first line of the `save` callback (line 54-55) so a starter is never persisted:

```ts
  const save = useCallback(async (d: KnowflowDoc) => {
    if (isStarter(d.id)) return; // starter flows are read-only
    try {
```

- [ ] **Step 4: Boot from starters instead of seeding a blank**

Replace the boot effect body (lines 68-84) with:

```ts
  useEffect(() => {
    if (booted.current) return; booted.current = true;
    (async () => {
      const list = await listFlows();
      const mine = list.filter(f => !f.starter).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      const first = mine[0] ?? list.find(f => f.starter);
      if (first) {
        const d = await resolveFlow(first.id);
        if (d) { resetDoc(d); lastSynced.current = d.meta.updatedAt; }
      }
      setLibrary(list);
      setLoading(false);
    })();
  }, [resetDoc]);
```

- [ ] **Step 5: History-aware open, plus follow/back**

Replace `openSaved` (line 97) and add the navigation handlers. Change:

```ts
  const openSaved = async (id: string) => { const d = await getDoc(id); if (d) switchTo(d); };
```

to:

```ts
  const openFlow = async (id: string) => { const d = await resolveFlow(id); if (d) { switchTo(d); setHistory([]); } };
  const follow = async (targetId: string) => {
    const target = await resolveFlow(targetId);
    if (!target) return; // broken/missing link: safe no-op
    setHistory(h => [...h, doc.id]);
    switchTo(target);
  };
  const goBack = async () => {
    if (!history.length) return;
    const prevId = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    const d = await resolveFlow(prevId);
    if (d) switchTo(d);
  };
```

Update the two other callers of `openSaved`:
- In `handleDeleteDoc` (line 104): `if (rest.length) openFlow(rest[0].id); else newBlank('flowchart');`
- In `newBlank` (line 96): add `setHistory([]);` — `const newBlank = (preset: Preset) => { const d = createDoc(preset, 'Untitled'); switchTo(d); upsertSummary(d); setHistory([]); };`

- [ ] **Step 6: Add the Back button + fix the panel call site**

In the topbar-left (after the `preset-tag` span, ~line 183), add:

```tsx
          {history.length > 0 && (
            <button className="tbtn" onClick={goBack} title="Back to the flow you came from">← Back</button>
          )}
```

Change the `DiagramsPanel` call (line 261-268): `onOpen={openSaved}` → `onOpen={openFlow}`. (The `docs={[...library].sort(...)}` prop already carries starters now; leave the sort — the panel regroups internally.)

- [ ] **Step 7: Build to verify Tasks 4 + 5 type-check together**

Run: `npm run build`
Expected: PASS (Task 4's DiagramsPanel now receives `FlowSummary[]`).

- [ ] **Step 8: Commit Tasks 4 + 5**

Run: `npm test`
Expected: green.

```bash
git add src/editor/DiagramsPanel.tsx src/editor/DiagramsPanel.css src/editor/EditorScreen.tsx
git commit -m "feat(editor): starter-aware panel + follow/back navigation + boot from starters"
```

---

## Task 6: Door affordance — follow a link from a node

**Files:**
- Modify: `src/canvas/adapter.ts`
- Modify: `src/canvas/KnowflowNode.tsx`, `src/canvas/KnowflowNode.css`
- Modify: `src/canvas/DiagramCanvas.tsx`
- Modify: `src/editor/EditorScreen.tsx` (pass `onFollow`)

**Interfaces:**
- Consumes: `Block.linkTo` (Task 1), `follow` (Task 5).
- Produces: a clickable "↗" door control on any node whose block has `linkTo`.

- [ ] **Step 1: Carry `linkTo` + `onFollow` in node data**

In `src/canvas/adapter.ts`, extend `KnowflowNodeData` (lines 6-12):

```ts
export interface KnowflowNodeData extends Record<string, unknown> {
  blockType: BlockType;
  text: string;
  /** Set by the editable canvas so the node shows resize handles + commits resizes. */
  editable?: boolean;
  onResize?: (width: number, height: number) => void;
  /** Set when this block is a door (Block.linkTo) — clicking the affordance follows it. */
  linkTo?: string;
  onFollow?: (targetId: string) => void;
}
```

In `nodesFor` (line 27), include `linkTo` in `data`:

```ts
      data: { blockType: b.type, text: b.text, linkTo: b.linkTo },
```

- [ ] **Step 2: Render the door affordance**

In `src/canvas/KnowflowNode.tsx`, add the button inside the node div (after the `kf-label` div, line 29):

```tsx
      <div className="kf-label">{data.text}</div>
      {data.linkTo && (
        <button
          className="kf-door"
          title="Open the linked flow"
          onClick={(e) => { e.stopPropagation(); data.onFollow?.(data.linkTo!); }}
        >↗</button>
      )}
```

Add a `kf-has-link` marker class on the wrapper so it can carry a hint style — change line 15's className to append it:

```tsx
    <div className={`kf-node kf-${style.shape} ${selected ? 'kf-selected' : ''} ${data.editable ? 'kf-editable' : ''} ${data.linkTo ? 'kf-has-link' : ''}`} style={cssVars}>
```

- [ ] **Step 3: Style the door**

Append to `src/canvas/KnowflowNode.css`:

```css
.kf-door {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  color: var(--border);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kf-door:hover { background: var(--border); color: #fff; }
.kf-has-link { box-shadow: inset 0 0 0 2px var(--border); }
```

- [ ] **Step 4: Thread `onFollow` through the canvas**

In `src/canvas/DiagramCanvas.tsx`:

Add to `Props` (after `onDeleteConnection`, line 30):

```ts
  onFollow?: (targetId: string) => void;
```

Destructure it (line 34-35): add `onFollow` to the list.

In the `derivedNodes` map (lines 51-60), always attach `onFollow` and `linkTo` to `data`. Replace the `data:` expression with:

```ts
      data: {
        ...n.data,
        onFollow,
        ...(editable ? { editable: true, onResize: (w: number, h: number) => onResize?.(n.id, { w, h }) } : {}),
      },
```

Add `onFollow` to that `useMemo` dependency array (line 59): `[derived.nodes, editable, onResize, onFollow, selectedId]`.

- [ ] **Step 5: Pass `follow` from EditorScreen**

In `src/editor/EditorScreen.tsx`, in the `<DiagramCanvas ... />` props (around line 244), add:

```tsx
              onDeleteConnection={handleDeleteConnection}
              onFollow={follow}
```

- [ ] **Step 6: Build + full suite**

Run: `npm run build && npm test`
Expected: green. (`src/canvas/adapter.test.ts` uses `toMatchObject` for `data`, a partial match — adding `linkTo` needs no test change.)

- [ ] **Step 7: Manual end-to-end verification**

Run: `npm run dev`, open the app (no `.env.local` needed for this).
- The app boots into a starter flow (e.g. **Reset Password**), not a blank "Untitled".
- The **Verify caller identity** node shows a **↗** button.
- Click **↗** → the canvas swaps to **Verification**; a **← Back** button appears in the topbar.
- Click **← Back** → you return to Reset Password; the Back button disappears.
- Open **2FA** from the panel → follow a **Set OU to No2FA** door → Back returns to 2FA.

- [ ] **Step 8: Commit**

```bash
git add src/canvas/adapter.ts src/canvas/KnowflowNode.tsx src/canvas/KnowflowNode.css src/canvas/DiagramCanvas.tsx src/editor/EditorScreen.tsx
git commit -m "feat(canvas): door affordance to follow a node's linked flow"
```

---

## Task 7: Read-only starter flows

**Files:**
- Modify: `src/editor/EditorScreen.tsx`
- Modify: `src/editor/EditorScreen.css`

**Interfaces:**
- Consumes: `isStarter` (Task 3). No new exports.

- [ ] **Step 1: Derive `readOnly` and gate the canvas + title/desc**

In `src/editor/EditorScreen.tsx`, after `errors` (line 44), add:

```ts
  const readOnly = isStarter(doc.id);
```

Make the canvas non-editable for starters — change `editable` on `<DiagramCanvas>` (line 233): `editable={!readOnly}`. (Leave `onFollow` — following must work read-only.)

Make the title/desc inputs read-only — add `readOnly={readOnly}` to both `<input className="doc-title" …>` and `<input className="doc-desc" …>` (lines 187-190).

- [ ] **Step 2: Hide edit-only topbar controls + swap the save pill**

Wrap the **Connect** button so it hides for starters — change its condition (line 196) from `{connectable && (` to `{connectable && !readOnly && (`.

Replace the save pill (lines 202-205) with a conditional:

```tsx
          {readOnly ? (
            <span className="save save-readonly" title="Starter flows are read-only.">Starter · read-only</span>
          ) : (
            <span className={`save save-${status}`} role="status" aria-live="polite"
              title="Your changes save automatically to the shared library.">
              {status === 'saving' ? 'Saving…' : status === 'error' ? '⚠ Not saved' : 'Saved ✓'}
            </span>
          )}
```

In the ⋯ More menu, hide the mutating actions for starters — wrap "Tidy up layout" and "Clear all blocks" each in `{!readOnly && ( … )}` (lines 212-213 and 218-219). Leave PNG/PDF/Feedback available.

- [ ] **Step 3: Show a read-only note instead of the edit panel**

In the right panel body (lines 282-302), gate the editing UI behind `!readOnly`. Change the opening of the conditional so a starter shows a note:

```tsx
            <div className="panel-body">
              {readOnly ? (
                <div className="ro-note">
                  <p><b>Starter flow — read-only.</b></p>
                  <p>This is a curated reference flow. Editing your own copy comes next; for now, follow the ↗ links and use Back to return.</p>
                </div>
              ) : selectedEdgeId ? (
                <EdgeInspector
```

(The existing `) : selectedId ? ( … ) : ( <Palette … /> )}` chain stays as the `else` branches.)

- [ ] **Step 4: Style the read-only note**

Append to `src/editor/EditorScreen.css`:

```css
.ro-note { padding: 14px 16px; color: var(--ink2, #5C564B); font-size: 14px; }
.ro-note p { margin: 0 0 10px; }
.save-readonly { color: var(--muted, #978D7C); font-style: italic; }
```

- [ ] **Step 5: Build + full suite**

Run: `npm run build && npm test`
Expected: green.

- [ ] **Step 6: Manual end-to-end verification**

Run: `npm run dev`.
- Boot into a starter → the right panel shows **"Starter flow — read-only"**, the save pill reads **"Starter · read-only"**, no **Connect** button, title/description not editable, the ⋯ More menu shows only Download PNG/PDF + Feedback.
- Nodes don't drag; no resize handles appear on selection.
- ↗ door still follows; **New blank diagram** (from the panel) opens an editable, savable doc where the full editor returns and the save pill works.
- Create/open one of *your* flows, confirm editing + autosave still work exactly as before.

- [ ] **Step 7: Commit**

```bash
git add src/editor/EditorScreen.tsx src/editor/EditorScreen.css
git commit -m "feat(editor): render starter flows read-only"
```

---

## Done-when (Slice 1)

- App opens directly into a curated starter flow with an empty stored library — no blank "Untitled", no backend.
- The Diagrams panel lists **Starter flows** (badged, no delete) and **Your flows** separately.
- A node with `linkTo` shows a ↗ door; clicking it follows to the target flow; **← Back** returns; loops/shared flows work (no special-casing); a missing target is a silent no-op.
- Starter flows are read-only (never saved/deleted); your own flows edit + autosave unchanged.
- `npm test` (existing 77 + new logic tests) and `npm run build` are green.

## Deferred to Slice 2 (own plan)

Inspector "Links to flow →" picker · "Make an editable copy" fork · "Export as starter" helper · broken-link **visual** warning (Slice 1 only guarantees the safe no-op) · fishbone door affordance · flow-level "related flows" · bird's-eye map.
