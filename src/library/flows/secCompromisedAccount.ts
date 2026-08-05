import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-05T00:00:00.000Z';

export const secCompromisedAccount: KnowflowDoc = {
  id: 'starter:sec-compromised-account',
  title: 'Compromised Account or Device',
  description: "However it reaches us, Service Desk's job is the password reset. A customer calling in goes straight to the reset; CASA- and InfoSec-flagged cases notify the user first, where a phone number exists — check the number listed in AD or ServiceNow. CASA flags Google account compromises (manually or automatically); InfoSec raises a ticket when Sophos MDR catches a compromised AD account or device. Deeper cleanup is owned by CASA / InfoSec / Server Ops.",
  preset: 'flowchart',
  blocks: [
    { id: 'ca-casa', type: 'step', text: 'CASA flag — Google account compromise' },
    { id: 'ca-infosec', type: 'step', text: 'InfoSec ticket — Sophos MDR alert' },
    { id: 'ca-customer', type: 'step', text: 'Customer called in — hacked email or device' },
    { id: 'ca-notify', type: 'step', text: 'Notify the user if a phone number is listed' },
    { id: 'ca-reset', type: 'step', text: 'Reset Password', linkTo: 'starter:reset-password' },
    { id: 'ca-cleanup', type: 'step', text: 'Security Tasks', linkTo: 'starter:sec-remediation' },
    { id: 'ca-done', type: 'outcome', text: 'Account/Device secured and restored' },
  ],
  connections: [
    { id: 'cac1', from: 'ca-casa', to: 'ca-notify' },
    { id: 'cac2', from: 'ca-infosec', to: 'ca-notify' },
    { id: 'cac3', from: 'ca-customer', to: 'ca-reset' },
    { id: 'cac4', from: 'ca-notify', to: 'ca-reset' },
    { id: 'cac5', from: 'ca-reset', to: 'ca-cleanup' },
    { id: 'cac6', from: 'ca-cleanup', to: 'ca-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: UPDATED, status: 'official', version: 2 },
};
