import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-05T00:00:00.000Z';

export const secPhishing: KnowflowDoc = {
  id: 'starter:sec-phishing',
  title: 'Phishing',
  description: 'Direct the user to the phish hook. CASA triages from there.',
  preset: 'flowchart',
  blocks: [
    { id: 'ph-trigger', type: 'step', text: 'Customer reports phishing' },
    { id: 'ph-hook', type: 'step', text: 'Direct the user to the KnowBe4 phish hook button' },
    { id: 'ph-reg', type: 'decision', text: 'Phish hook fails or asks for a registration key?' },
    { id: 'ph-key', type: 'step', text: 'Provide the registration key (KB0017446)' },
    { id: 'ph-done', type: 'outcome', text: 'Reported via phish hook — CASA triages' },
  ],
  connections: [
    { id: 'phc1', from: 'ph-trigger', to: 'ph-hook' },
    { id: 'phc2', from: 'ph-hook', to: 'ph-reg' },
    { id: 'phc3', from: 'ph-reg', to: 'ph-done', label: 'Works' },
    { id: 'phc4', from: 'ph-reg', to: 'ph-key', label: 'Asks for key' },
    { id: 'phc5', from: 'ph-key', to: 'ph-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: UPDATED, status: 'official', version: 2 },
};
