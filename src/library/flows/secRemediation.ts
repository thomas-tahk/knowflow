import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-04T00:00:00.000Z';

export const secRemediation: KnowflowDoc = {
  id: 'starter:sec-remediation',
  title: 'Security Tasks',
  description: 'The standard security tasks for an incident. These run in this order. Step 3 is requested by either CASA or InfoSec, and completed by Server Ops.',
  preset: 'flowchart',
  blocks: [
    { id: 'rm-1a', type: 'step', text: '1a · Reset the password — even for disabled accounts (Service Desk)', linkTo: 'starter:reset-password' },
    { id: 'rm-1b', type: 'step', text: "1b · Sign the user out of all unknown devices — user-action option, or Google Admin 'reset sign-in cookies' (InfoSec relays this to CASA)" },
    { id: 'rm-2', type: 'step', text: "2 · Clean the inbox/email (CASA): check 'Send As'/alias settings, remove bad filters, and ensure there are no forwarding rules" },
    { id: 'rm-3-casa', type: 'step', text: '3 · CASA creates the task for Server Ops' },
    { id: 'rm-3-infosec', type: 'step', text: '3 · InfoSec creates the task for Server Ops' },
    { id: 'rm-3-so', type: 'step', text: 'Request to Server Ops to reset the Azure tokens' },
    { id: 'rm-4', type: 'step', text: '4 · PC/Mac security: run a Sophos full system scan; request a re-image via TCS if needed' },
  ],
  connections: [
    { id: 'rmc1', from: 'rm-1a', to: 'rm-1b' },
    { id: 'rmc2', from: 'rm-1b', to: 'rm-2' },
    { id: 'rmc3', from: 'rm-2', to: 'rm-3-casa' },
    { id: 'rmc4', from: 'rm-2', to: 'rm-3-infosec' },
    { id: 'rmc5', from: 'rm-3-casa', to: 'rm-3-so' },
    { id: 'rmc6', from: 'rm-3-infosec', to: 'rm-3-so' },
    { id: 'rmc7', from: 'rm-3-so', to: 'rm-4' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: UPDATED, status: 'official', version: 2 },
};
