import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-15T00:00:00.000Z';

export const resetPassword: KnowflowDoc = {
  id: 'starter:reset-password',
  title: 'Reset Password',
  description: 'Reset a customer password and walk them through setting their own.',
  preset: 'flowchart',
  blocks: [
    { id: 'r-verify', type: 'step', text: 'Verify caller identity', linkTo: 'starter:verification' },
    { id: 'r-temp', type: 'step', text: 'Reset to the monthly default (temporary) password at directory.aps.edu/rDirectory' },
    { id: 'r-pw', type: 'step', text: "Customer opens pwreset.aps.edu and clicks 'Change my password'" },
    { id: 'r-captcha', type: 'step', text: '1 · CAPTCHA (word on desktop / math on mobile)' },
    { id: 'r-login', type: 'step', text: '2 · Log in (username + temporary password)' },
    { id: 'r-setpw', type: 'step', text: '3 · Set new password (meets requirements; no personal info; not a reused password)' },
    { id: 'r-submit', type: 'decision', text: 'Submit' },
    { id: 'r-done', type: 'outcome', text: 'Password has been changed (confirmation message)' },
    { id: 'r-perm', type: 'step', text: "Set a PERMANENT password directly in rDirectory (skip pwreset; UNCHECK 'Change password upon next login')" },
  ],
  connections: [
    { id: 'rc1', from: 'r-verify', to: 'r-temp' },
    { id: 'rc2', from: 'r-temp', to: 'r-pw' },
    { id: 'rc3', from: 'r-pw', to: 'r-captcha' },
    { id: 'rc4', from: 'r-captcha', to: 'r-login' },
    { id: 'rc5', from: 'r-login', to: 'r-setpw' },
    { id: 'rc6', from: 'r-setpw', to: 'r-submit' },
    { id: 'rc7', from: 'r-submit', to: 'r-done', label: 'Success' },
    { id: 'rc8', from: 'r-submit', to: 'r-pw', label: 'Failed, first time' },
    { id: 'rc9', from: 'r-submit', to: 'r-perm', label: 'Failed again (2nd+)' },
    { id: 'rc10', from: 'r-perm', to: 'r-done' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
