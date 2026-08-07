const KEY = 'kf_pw';

const listeners = new Set<() => void>();
const notify = (): void => { listeners.forEach(fn => fn()); };

export const getPassword = (): string => sessionStorage.getItem(KEY) ?? '';
export const setPassword = (pw: string): void => { sessionStorage.setItem(KEY, pw); notify(); };
export const clearPassword = (): void => { sessionStorage.removeItem(KEY); notify(); };

/**
 * Whether this visitor may edit. Reading needs no password at all — anyone with the URL
 * sees the official flows (`api/docs.ts`). Local dev has no `APP_PASSWORD` to check
 * against, so editing is always on there — except with `?anon` in the URL, which is the
 * only way to see the anonymous UI without deploying. Dev-only: in production the
 * password is the sole answer, and a query string cannot grant anything.
 */
export const isAuthed = (): boolean => {
  if (import.meta.env.DEV) return !new URLSearchParams(location.search).has('anon');
  return !!sessionStorage.getItem(KEY);
};

/** Subscribe to sign-in / sign-out. Returns an unsubscribe function. */
export function subscribeAuth(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Header sent with API calls. Absent for anonymous readers, which is what makes the
 *  server serve them the public (official-only) scope. */
export const authHeaders = (): Record<string, string> => {
  const pw = getPassword();
  return pw ? { 'x-app-password': pw } : {};
};
