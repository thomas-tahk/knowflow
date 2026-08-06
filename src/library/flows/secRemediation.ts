import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-05T00:00:00.000Z';

export const secRemediation: KnowflowDoc = {
  id: 'starter:sec-remediation',
  title: 'Security Tasks',
  description: 'The standard security tasks for an incident, in the order they run.',
  preset: 'flowchart',
  blocks: [
    { id: 'rm-1a', type: 'step', text: 'Reset the password, including disabled accounts (Service Desk)', linkTo: 'starter:reset-password' },
    { id: 'rm-1b', type: 'step', text: 'Sign out of all unknown devices — user action or Google Admin (CASA)' },
    { id: 'rm-2', type: 'step', text: 'Clean the inbox — filters, forwarding, aliases (CASA)' },
    { id: 'rm-3-so', type: 'step', text: 'InfoSec or CASA creates a task for Server Ops to reset the Azure tokens' },
    { id: 'rm-4', type: 'step', text: 'Sophos full scan (PC/Mac); re-image via TCS if needed' },
  ],
  connections: [
    { id: 'rmc1', from: 'rm-1a', to: 'rm-1b' },
    { id: 'rmc2', from: 'rm-1b', to: 'rm-2' },
    { id: 'rmc3', from: 'rm-2', to: 'rm-3-so' },
    { id: 'rmc7', from: 'rm-3-so', to: 'rm-4' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: UPDATED, status: 'official', version: 2 },
};
