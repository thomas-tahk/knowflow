import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';

export const secRemediation: KnowflowDoc = {
  id: 'starter:sec-remediation',
  title: 'Security Tasks',
  description: 'The standard security tasks for an incident. These run in this order.',
  preset: 'stepList',
  blocks: [
    { id: 'rm-1a', type: 'step', text: '1a · Reset the password — even for disabled accounts (Service Desk)', linkTo: 'starter:reset-password' },
    { id: 'rm-1b', type: 'step', text: "1b · Sign the user out of all unknown devices — user-action option, or Google Admin 'reset sign-in cookies' (InfoSec instructs CASA)" },
    { id: 'rm-2', type: 'step', text: "2 · Clean the inbox/email (CASA): check 'Send As'/alias settings, remove bad filters, and ensure there are no forwarding rules" },
    { id: 'rm-3', type: 'step', text: '3 · Reset Azure tokens (InfoSec → Server Ops)' },
    { id: 'rm-4', type: 'step', text: '4 · PC/Mac security: run a Sophos full system scan; request a re-image via TCS if needed' },
  ],
  connections: [],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
