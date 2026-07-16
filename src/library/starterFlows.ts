import type { KnowflowDoc } from '../core/types';
import { resetPassword } from './flows/resetPassword';
import { twoFactor } from './flows/twoFactor';
import { verification } from './flows/verification';
import { setNo2faOu } from './flows/setNo2faOu';

/** Curated flows bundled with the app (present with no backend). Order = display order. */
export const STARTER_FLOWS: KnowflowDoc[] = [verification, resetPassword, twoFactor, setNo2faOu];
