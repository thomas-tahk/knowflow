import { describe, it, expect } from 'vitest';
import { newId, nowIso } from './ids';

describe('ids', () => {
  it('newId returns a non-empty unique string', () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe('');
    expect(a).not.toBe(b);
  });

  it('nowIso returns an ISO-8601 string', () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
