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
