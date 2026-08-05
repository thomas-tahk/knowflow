import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-05T00:00:00.000Z';

export const secDarkwebPassword: KnowflowDoc = {
  id: 'starter:sec-darkweb-password',
  title: 'Darkweb Alert',
  description: "Two separate originations: a state/federal or darkweb alert that reaches InfoSec, and a Google notification sent straight to the end user telling them to change their password. On the Google branch, users may disregard it, report it as phishing, or call in — direct them to change their password even if they're not aware of the notification. Service Desk is minimally involved in both.",
  preset: 'flowchart',
  blocks: [
    { id: 'dw-trigger', type: 'step', text: 'InfoSec alert — darkweb or state/federal' },
    { id: 'dw-confirm', type: 'step', text: 'Confirm to the customer that it is legitimate' },

    { id: 'dw-google', type: 'step', text: 'Google notifies the user directly' },
    { id: 'dw-google-react', type: 'step', text: 'User disregards, reports as phishing, or calls in' },
    { id: 'dw-google-direct', type: 'step', text: 'Direct the customer to change their password' },
    { id: 'dw-google-task', type: 'step', text: 'InfoSec or CASA creates a Service Desk reset task' },

    { id: 'dw-reset', type: 'step', text: 'Reset Password', linkTo: 'starter:reset-password' },
    { id: 'dw-done', type: 'outcome', text: "IT's involvement is complete" },
  ],
  connections: [
    { id: 'dwc1', from: 'dw-trigger', to: 'dw-confirm' },
    { id: 'dwc2', from: 'dw-confirm', to: 'dw-reset' },

    { id: 'dwc4', from: 'dw-google', to: 'dw-google-react' },
    { id: 'dwc5', from: 'dw-google-react', to: 'dw-google-direct' },
    { id: 'dwc6', from: 'dw-google-direct', to: 'dw-google-task' },
    { id: 'dwc7', from: 'dw-google-task', to: 'dw-reset' },

    { id: 'dwc3', from: 'dw-reset', to: 'dw-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: UPDATED, status: 'official', version: 2 },
};
