import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';

export const secLetsTalk: KnowflowDoc = {
  id: 'starter:sec-lets-talk',
  title: "Let's Talk",
  description: "A security concern that arrives through a 'Let's Talk' ticket. Any team can receive these; route to Service Desk.",
  preset: 'flowchart',
  blocks: [
    { id: 'lt-trigger', type: 'step', text: "Any 'Let's Talk' ticket that involves a security incident or concern" },
    { id: 'lt-why', type: 'step', text: "Why a ticket/call: the 'Let's Talk' reporter could be a bad actor — a ticket or call lets us verify it's really the user" },
    { id: 'lt-direct', type: 'step', text: 'Direct the user to open a ticket with the Service Desk' },
    { id: 'lt-inc', type: 'step', text: 'Create the incident (INC) in ServiceNow' },
    { id: 'lt-done', type: 'outcome', text: 'Ticket created and resolved' },
  ],
  connections: [
    { id: 'ltc0', from: 'lt-trigger', to: 'lt-why' },
    { id: 'ltc1', from: 'lt-why', to: 'lt-direct' },
    { id: 'ltc2', from: 'lt-direct', to: 'lt-inc' },
    { id: 'ltc3', from: 'lt-inc', to: 'lt-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
