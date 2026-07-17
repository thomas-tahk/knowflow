import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-17T00:00:00.000Z';

// Recreated (skeleton only) from the team's "Disabled Account" fishbone.
// knowflow's fishbone model can't carry the original's colors, on-rib team
// labels, legends, or annotation arrows, so those are folded into the cause
// text (e.g. the team is appended to each bone title) or dropped.
export const disabledAccount: KnowflowDoc = {
  id: 'starter:disabled-account',
  title: 'Disabled Account',
  description: "The scenarios that leave an account disabled, and who handles each — recreated from the team's fishbone.",
  preset: 'fishbone',
  blocks: [
    { id: 'da-spine', type: 'spine', text: 'Disabled Account' },

    { id: 'da-adg', type: 'category', text: 'Disabled in AD & Google / AD only (Server Ops → HR)' },
    { id: 'da-adg-1', type: 'cause', text: 'Disabled in AD only — note on incident (possible account compromise)', categoryId: 'da-adg' },
    { id: 'da-adg-2', type: 'cause', text: 'Check employee status in Lawson — did they change jobs or return?', categoryId: 'da-adg' },
    { id: 'da-adg-3', type: 'cause', text: 'If active in Lawson, Server Ops assigns to HR', categoryId: 'da-adg' },

    { id: 'da-goog', type: 'category', text: 'Disabled / Suspended in Google only (Casa)' },
    { id: 'da-goog-1', type: 'cause', text: 'Note last login date on incident — account compromised?', categoryId: 'da-goog' },
    { id: 'da-goog-2', type: 'cause', text: 'Casa reassigns to InfoSec or Service Desk if needed', categoryId: 'da-goog' },

    { id: 'da-sync', type: 'category', text: 'Status in One Sync (New Hires, Subs, Students)' },
    { id: 'da-sync-1', type: 'cause', text: 'Note the disabled or active date', categoryId: 'da-sync' },
    { id: 'da-sync-2', type: 'cause', text: 'If active date is today/yesterday, wait for the account to enable', categoryId: 'da-sync' },
    { id: 'da-sync-3', type: 'cause', text: 'Employee: start date today/past → HR; if a Sub → contact Kelly Services', categoryId: 'da-sync' },

    { id: 'da-new', type: 'category', text: 'New Hire / Student (HR, SIS, Registrar — See KB0017601)' },
    { id: 'da-new-1', type: 'cause', text: 'Student: primary school? No Google Workspace for Charter Schools', categoryId: 'da-new' },
    { id: 'da-new-2', type: 'cause', text: 'New Hire: no access until their start date', categoryId: 'da-new' },
    { id: 'da-new-3', type: 'cause', text: 'New Student: active 24–48h after Synergy enter date; else assign to SIS', categoryId: 'da-new' },
    { id: 'da-new-4', type: 'cause', text: 'No valid Synergy enrollment → School Registrar → Student Service Ctr → SIS', categoryId: 'da-new' },
    { id: 'da-new-5', type: 'cause', text: 'Sponsor enters a new request in the Employee Portal', categoryId: 'da-new' },

    { id: 'da-contract', type: 'category', text: 'Contractor' },
    { id: 'da-contract-1', type: 'cause', text: 'Sponsor enters a new request in the Employee Portal', categoryId: 'da-contract' },

    { id: 'da-kelly', type: 'category', text: 'Kelly Services — Substitute' },
    { id: 'da-kelly-1', type: 'cause', text: 'If active date is today/yesterday, wait for the account to become active', categoryId: 'da-kelly' },
    { id: 'da-kelly-2', type: 'cause', text: 'Check One Sync — if disabled, have the sub contact Kelly Services', categoryId: 'da-kelly' },
  ],
  connections: [],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
