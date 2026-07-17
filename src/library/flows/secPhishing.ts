import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';

export const secPhishing: KnowflowDoc = {
  id: 'starter:sec-phishing',
  title: 'Phishing',
  description: 'Minimal per current process — direct users to the phish hook. Further CASA-side sub-types (bad-guy phish, training-hook abuse, spam) to be specified with supervisor.',
  preset: 'flowchart',
  blocks: [
    { id: 'ph-trigger', type: 'step', text: 'Customer reports phishing (e.g. a group being phished, or a suspicious email)' },
    { id: 'ph-hook', type: 'step', text: 'Direct the user to report it with the KnowBe4 phish hook button' },
    { id: 'ph-reg', type: 'decision', text: 'Does the phish hook fail or ask for a registration key?' },
    { id: 'ph-key', type: 'step', text: 'Provide the registration key — info in KB0017446' },
    { id: 'ph-done', type: 'outcome', text: 'Reported via the phish hook — CASA handles triage' },
  ],
  connections: [
    { id: 'phc1', from: 'ph-trigger', to: 'ph-hook' },
    { id: 'phc2', from: 'ph-hook', to: 'ph-reg' },
    { id: 'phc3', from: 'ph-reg', to: 'ph-done', label: 'Works' },
    { id: 'phc4', from: 'ph-reg', to: 'ph-key', label: 'Asks for key' },
    { id: 'phc5', from: 'ph-key', to: 'ph-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
