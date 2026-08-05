import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-05T00:00:00.000Z';

export const secLetsTalk: KnowflowDoc = {
  id: 'starter:sec-lets-talk',
  title: "Let's Talk",
  description: "A security concern that arrives through a 'Let's Talk' ticket. Route it to the Service Desk.",
  preset: 'flowchart',
  blocks: [
    { id: 'lt-trigger', type: 'step', text: "'Let's Talk' ticket about a security incident or concern" },
    { id: 'lt-direct', type: 'outcome', text: 'Direct the customer to call the Service Desk' },
  ],
  connections: [
    { id: 'ltc0', from: 'lt-trigger', to: 'lt-direct', label: 'A ticket or call verifies the real user — the reporter could be a bad actor' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: UPDATED, status: 'official', version: 2 },
};
