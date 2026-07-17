import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';

export const secIntake: KnowflowDoc = {
  id: 'starter:sec-intake',
  title: 'Security Incident Intake',
  description: 'Start here. Route an incoming security ticket to the right response flow.',
  preset: 'flowchart',
  blocks: [
    { id: 'si-q', type: 'decision', text: 'Security incident — what is being reported?' },
    { id: 'si-phish', type: 'step', text: 'Phishing', linkTo: 'starter:sec-phishing' },
    { id: 'si-malware', type: 'step', text: 'Malware / Virus / Takeover', linkTo: 'starter:sec-malware' },
    { id: 'si-compromised', type: 'step', text: 'Compromised Account or Device', linkTo: 'starter:sec-compromised-account' },
    { id: 'si-darkweb', type: 'step', text: 'Darkweb Alert', linkTo: 'starter:sec-darkweb-password' },
    { id: 'si-letstalk', type: 'step', text: "Let's Talk", linkTo: 'starter:sec-lets-talk' },
  ],
  connections: [
    { id: 'sic2', from: 'si-q', to: 'si-phish' },
    { id: 'sic4', from: 'si-q', to: 'si-malware' },
    { id: 'sic5', from: 'si-q', to: 'si-compromised' },
    { id: 'sic7', from: 'si-q', to: 'si-darkweb' },
    { id: 'sic8', from: 'si-q', to: 'si-letstalk' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
