const KEY = 'kf_pw';

export const getPassword = (): string => sessionStorage.getItem(KEY) ?? '';
export const setPassword = (pw: string): void => sessionStorage.setItem(KEY, pw);

/** Header sent with protected API calls (AI generation, feedback). Empty in local dev. */
export const authHeaders = (): Record<string, string> => {
  const pw = getPassword();
  return pw ? { 'x-app-password': pw } : {};
};
