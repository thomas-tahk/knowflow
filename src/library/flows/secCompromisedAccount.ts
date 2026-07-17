import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';

export const secCompromisedAccount: KnowflowDoc = {
  id: 'starter:sec-compromised-account',
  title: 'Compromised Account or Device',
  description: "However it reaches us, Service Desk's job is the password reset. Notifying the user first is best-effort — in practice we often have no way to reach them. Deeper cleanup is owned by CASA / InfoSec / Server Ops.",
  preset: 'flowchart',
  blocks: [
    { id: 'ca-casa', type: 'step', text: 'CASA flagged it — a Google account compromise (flagged manually or automatically)' },
    { id: 'ca-infosec', type: 'step', text: 'InfoSec made a ticket — Sophos MDR caught a compromised AD account or device' },
    { id: 'ca-customer', type: 'step', text: 'Customer called in — a hacked email, or another compromised account/device concern' },
    { id: 'ca-notify', type: 'step', text: "Notify the user if you can reach them (in practice, often you can't)" },
    { id: 'ca-reset', type: 'step', text: 'Reset Password', linkTo: 'starter:reset-password' },
    { id: 'ca-cleanup', type: 'step', text: 'Security Tasks', linkTo: 'starter:sec-remediation' },
    { id: 'ca-done', type: 'outcome', text: 'Account/Device secured and restored' },
  ],
  connections: [
    { id: 'cac1', from: 'ca-casa', to: 'ca-notify' },
    { id: 'cac2', from: 'ca-infosec', to: 'ca-notify' },
    { id: 'cac3', from: 'ca-customer', to: 'ca-notify' },
    { id: 'cac4', from: 'ca-notify', to: 'ca-reset' },
    { id: 'cac5', from: 'ca-reset', to: 'ca-cleanup' },
    { id: 'cac6', from: 'ca-cleanup', to: 'ca-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
