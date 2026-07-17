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

/** Curated flows bundled with the app (present with no backend). Order = display order. */
export const STARTER_FLOWS: KnowflowDoc[] = [
  verification, resetPassword, twoFactor, setNo2faOu,
  secIntake,
  secPhishing, secMalware, secCompromisedAccount,
  secDarkwebPassword, secLetsTalk,
  secRemediation, secOwnershipMap,
  disabledAccount,
];
