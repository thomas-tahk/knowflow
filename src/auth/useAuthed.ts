import { useSyncExternalStore } from 'react';
import { isAuthed, subscribeAuth } from './session';

/** Whether this visitor may edit. Re-renders on sign-in / sign-out.
 *  Was a full-screen gate (`AuthGate`) until reads went public. */
export function useAuthed(): boolean {
  return useSyncExternalStore(subscribeAuth, isAuthed, isAuthed);
}
