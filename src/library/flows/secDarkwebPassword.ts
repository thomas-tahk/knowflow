import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';

export const secDarkwebPassword: KnowflowDoc = {
  id: 'starter:sec-darkweb-password',
  title: 'Darkweb Alert',
  description: 'A state/federal or darkweb alert about a password. Service Desk is minimally involved — confirm the alert is legitimate and reset the password.',
  preset: 'flowchart',
  blocks: [
    { id: 'dw-trigger', type: 'step', text: "InfoSec-originated: a state/federal or darkweb alert (or Google notification) about a user's password" },
    { id: 'dw-confirm', type: 'step', text: "Let the customer know it's a valid, legitimate notification" },
    { id: 'dw-reset', type: 'step', text: 'Reset Password', linkTo: 'starter:reset-password' },
    { id: 'dw-done', type: 'outcome', text: "IT's involvement is complete" },
  ],
  connections: [
    { id: 'dwc1', from: 'dw-trigger', to: 'dw-confirm' },
    { id: 'dwc2', from: 'dw-confirm', to: 'dw-reset' },
    { id: 'dwc3', from: 'dw-reset', to: 'dw-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
