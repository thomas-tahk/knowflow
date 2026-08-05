import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-05T00:00:00.000Z';

export const secDarkwebPassword: KnowflowDoc = {
  id: 'starter:sec-darkweb-password',
  title: 'Darkweb Alert',
  description: 'Two originations — InfoSec and CASA — that converge on the same password reset.',
  preset: 'flowchart',
  blocks: [
    { id: 'dw-trigger', type: 'step', text: "InfoSec receives a state or federal notice: an APS user's password found on the dark web" },
    { id: 'dw-google', type: 'step', text: 'CASA: Google notified the end user to change their password' },

    { id: 'dw-confirm', type: 'step', text: 'Confirm to the customer that it is legitimate' },
    { id: 'dw-reset', type: 'step', text: 'Reset Password', linkTo: 'starter:reset-password' },
    { id: 'dw-done', type: 'outcome', text: "IT's involvement is complete" },
  ],
  connections: [
    { id: 'dwc1', from: 'dw-trigger', to: 'dw-confirm' },
    { id: 'dwc4', from: 'dw-google', to: 'dw-confirm' },
    { id: 'dwc2', from: 'dw-confirm', to: 'dw-reset' },
    { id: 'dwc3', from: 'dw-reset', to: 'dw-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: UPDATED, status: 'official', version: 2 },
};
