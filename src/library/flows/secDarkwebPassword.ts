import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-04T00:00:00.000Z';

export const secDarkwebPassword: KnowflowDoc = {
  id: 'starter:sec-darkweb-password',
  title: 'Darkweb Alert',
  description: 'Two separate originations: an InfoSec alert about a password, and a Google notification sent straight to the end user. Service Desk is minimally involved in both.',
  preset: 'flowchart',
  blocks: [
    { id: 'dw-trigger', type: 'step', text: "InfoSec-originated: a state/federal or darkweb alert about a user's password" },
    { id: 'dw-confirm', type: 'step', text: "Let the customer know it's a valid, legitimate notification" },

    { id: 'dw-google', type: 'step', text: 'Google-originated: Google notifies the end user directly to change their password' },
    { id: 'dw-google-react', type: 'step', text: 'The user may disregard it, may report it as phishing, or may call the Service Desk' },
    { id: 'dw-google-direct', type: 'step', text: "Go ahead and direct the customer to change their password — they may not even be aware of the Google notification" },
    { id: 'dw-google-task', type: 'step', text: 'InfoSec or CASA creates a task for the Service Desk to reset the password' },

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
