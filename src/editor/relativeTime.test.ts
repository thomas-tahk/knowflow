import { describe, it, expect } from 'vitest';
import { relativeTime } from './relativeTime';

const now = Date.parse('2026-07-22T12:00:00Z');
const at = (iso: string) => relativeTime(iso, now);

describe('relativeTime', () => {
  it('says "just now" under a minute', () => {
    expect(at('2026-07-22T11:59:40Z')).toBe('just now');
  });

  it('uses minutes under an hour, singular and plural', () => {
    expect(at('2026-07-22T11:59:00Z')).toBe('1 minute ago');
    expect(at('2026-07-22T11:35:00Z')).toBe('25 minutes ago');
  });

  it('uses hours under a day', () => {
    expect(at('2026-07-22T09:00:00Z')).toBe('3 hours ago');
  });

  it('uses days beyond that', () => {
    expect(at('2026-07-20T12:00:00Z')).toBe('2 days ago');
  });
});
