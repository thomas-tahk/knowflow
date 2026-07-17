import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';

export const secOwnershipMap: KnowflowDoc = {
  id: 'starter:sec-ownership-map',
  title: 'Security Incident — Team Ownership Map',
  description: "Who owns what across the security-incident response — the supervisor's 'triangle' as a diagram.",
  preset: 'fishbone',
  blocks: [
    { id: 'om-spine', type: 'spine', text: 'Security incident handling' },

    { id: 'om-sd', type: 'category', text: 'Service Desk' },
    { id: 'om-sd-1', type: 'cause', text: 'Reset passwords (incl. disabled)', categoryId: 'om-sd' },
    { id: 'om-sd-2', type: 'cause', text: 'Notify user (best-effort)', categoryId: 'om-sd' },
    { id: 'om-sd-3', type: 'cause', text: 'Create INC ticket', categoryId: 'om-sd' },

    { id: 'om-casa', type: 'category', text: 'CASA' },
    { id: 'om-casa-1', type: 'cause', text: 'Google account suspensions', categoryId: 'om-casa' },
    { id: 'om-casa-2', type: 'cause', text: 'Inbox cleanup (filters/forwarding)', categoryId: 'om-casa' },
    { id: 'om-casa-3', type: 'cause', text: 'Sign out unknown devices', categoryId: 'om-casa' },

    { id: 'om-infosec', type: 'category', text: 'InfoSec' },
    { id: 'om-infosec-1', type: 'cause', text: 'Sophos / MDR alerts → INC', categoryId: 'om-infosec' },

    { id: 'om-serverops', type: 'category', text: 'Server Ops' },
    { id: 'om-serverops-1', type: 'cause', text: 'Reset Azure tokens', categoryId: 'om-serverops' },
  ],
  connections: [],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
