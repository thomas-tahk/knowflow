import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-15T00:00:00.000Z';

export const setNo2faOu: KnowflowDoc = {
  id: 'starter:set-no2fa-ou',
  title: 'Set OU to No2FA',
  description: 'Reusable: move the user into the No2FA org unit so 2-Step can be changed.',
  preset: 'flowchart',
  blocks: [
    { id: 'o-note', type: 'step', text: 'Note the original Org Unit (OU)' },
    { id: 'o-change', type: 'step', text: 'Change OU to: aps.edu › Staff › GoogleNoSync › No2FA' },
    { id: 'o-refresh', type: 'step', text: 'Refresh the page to confirm the OU updated' },
    { id: 'o-done', type: 'outcome', text: 'OU set — return to your flow' },
  ],
  connections: [
    { id: 'oc1', from: 'o-note', to: 'o-change' },
    { id: 'oc2', from: 'o-change', to: 'o-refresh' },
    { id: 'oc3', from: 'o-refresh', to: 'o-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
