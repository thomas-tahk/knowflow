export function newId(): string {
  // crypto.randomUUID is available in modern browsers and Node >= 19.
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Clock type used by operations so tests can inject deterministic values. */
export interface Clock {
  newId: () => string;
  nowIso: () => string;
}

export const systemClock: Clock = { newId, nowIso };
