import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-05T00:00:00.000Z';

export const secLetsTalk: KnowflowDoc = {
  id: 'starter:sec-lets-talk',
  title: "Let's Talk",
  description: "A security concern that arrives through a 'Let's Talk' ticket. Any team can receive these; route to Service Desk. We don't act on the 'Let's Talk' alone — the reporter could be a bad actor, and a ticket or call is what verifies we're dealing with the real user.",
  preset: 'flowchart',
  blocks: [
    { id: 'lt-trigger', type: 'step', text: "'Let's Talk' ticket with a security concern" },
    { id: 'lt-why', type: 'step', text: 'Verify the real user by ticket or call' },
    { id: 'lt-direct', type: 'outcome', text: 'Direct the user to call the Service Desk' },
  ],
  connections: [
    { id: 'ltc0', from: 'lt-trigger', to: 'lt-why' },
    { id: 'ltc1', from: 'lt-why', to: 'lt-direct' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: UPDATED, status: 'official', version: 2 },
};
