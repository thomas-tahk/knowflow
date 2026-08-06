import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-05T00:00:00.000Z';

export const secDarkwebPassword: KnowflowDoc = {
  id: 'starter:sec-darkweb-password',
  title: 'Dark Web Alert',
  description: 'Two originations: a notice that reaches InfoSec, and Google notifying the user.',
  preset: 'flowchart',
  blocks: [
    { id: 'dw-trigger', type: 'step', text: "InfoSec receives a state or federal notice: an APS user's password found on the dark web" },
    { id: 'dw-google', type: 'step', text: 'Google notifies the end user to change their password' },

    { id: 'dw-confirm', type: 'step', text: 'Confirm to the customer that the notification is legitimate' },
    { id: 'dw-task', type: 'step', text: 'InfoSec or CASA creates a task for Service Desk to reset the password' },
    { id: 'dw-reset', type: 'step', text: 'Reset Password', linkTo: 'starter:reset-password' },
    { id: 'dw-done', type: 'outcome', text: "IT's involvement is complete" },
  ],
  connections: [
    { id: 'dwc1', from: 'dw-trigger', to: 'dw-task' },
    { id: 'dwc4', from: 'dw-google', to: 'dw-confirm', label: 'User calls in — others ignore it or report phishing' },
    { id: 'dwc5', from: 'dw-confirm', to: 'dw-task' },
    { id: 'dwc2', from: 'dw-task', to: 'dw-reset' },
    { id: 'dwc3', from: 'dw-reset', to: 'dw-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: UPDATED, status: 'official', version: 2 },
};
