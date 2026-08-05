import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';
const UPDATED = '2026-08-05T00:00:00.000Z';

export const secRemediation: KnowflowDoc = {
  id: 'starter:sec-remediation',
  title: 'Security Tasks',
  description: "The standard security tasks for an incident. These run in this order. Step 1b is either a user action or Google Admin 'reset sign-in cookies' — InfoSec relays the instruction to CASA. Step 2 covers 'Send As'/alias settings, bad filters, and forwarding rules. Step 3 is requested by either CASA or InfoSec, and completed by Server Ops. Step 4 is a Sophos full system scan, with a re-image requested through TCS if the scan isn't enough.",
  preset: 'flowchart',
  blocks: [
    { id: 'rm-1a', type: 'step', text: '1a · Reset password, incl. disabled accounts (Service Desk)', linkTo: 'starter:reset-password' },
    { id: 'rm-1b', type: 'step', text: '1b · Sign out of all unknown devices (CASA)' },
    { id: 'rm-2', type: 'step', text: '2 · Clean the inbox — filters, forwarding, aliases (CASA)' },
    { id: 'rm-3-casa', type: 'step', text: '3 · CASA creates the task' },
    { id: 'rm-3-infosec', type: 'step', text: '3 · InfoSec creates the task' },
    { id: 'rm-3-so', type: 'step', text: 'Server Ops resets the Azure tokens' },
    { id: 'rm-4', type: 'step', text: '4 · Sophos full scan (PC/Mac); re-image via TCS if needed' },
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
