import type { KnowflowDoc } from '../core/types';
import { resetPassword } from './flows/resetPassword';
import { twoFactor } from './flows/twoFactor';
import { verification } from './flows/verification';
import { setNo2faOu } from './flows/setNo2faOu';
import { secIntake } from './flows/secIntake';
import { secPhishing } from './flows/secPhishing';
import { secMalware } from './flows/secMalware';
import { secCompromisedAccount } from './flows/secCompromisedAccount';
import { secDarkwebPassword } from './flows/secDarkwebPassword';
import { secLetsTalk } from './flows/secLetsTalk';
import { secRemediation } from './flows/secRemediation';
import { secOwnershipMap } from './flows/secOwnershipMap';
import { disabledAccount } from './flows/disabledAccount';

/** A titled topic of starter flows in the Diagrams panel. */
export interface StarterGroup {
  title: string;
  /** Collapsed on first render (session-only). */
  defaultCollapsed?: boolean;
  flows: KnowflowDoc[];
}

/** Curated flows bundled with the app (present with no backend). Order = display order. */
export const STARTER_GROUPS: StarterGroup[] = [
  {
    title: 'Account & Access',
    flows: [verification, resetPassword, twoFactor, setNo2faOu],
  },
  {
    title: 'Security Incident Intake',
    defaultCollapsed: true,
    flows: [
      secIntake,
      secPhishing, secMalware, secCompromisedAccount,
      secDarkwebPassword, secLetsTalk,
      secRemediation, secOwnershipMap,
      disabledAccount,
    ],
  },
];

/** Flat list of every starter, in display order. */
export const STARTER_FLOWS: KnowflowDoc[] = STARTER_GROUPS.flatMap(g => g.flows);
