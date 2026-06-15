import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeDebouncedSaver } from './useAutosave';
import type { KnowflowDoc } from '../core/types';

function doc(version: number): KnowflowDoc {
  return {
    id: 'd', title: 'T', preset: 'flowchart', blocks: [], connections: [],
    meta: { createdAt: 'x', updatedAt: 'x', status: 'draft', version },
  };
}

describe('makeDebouncedSaver', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires once with the latest doc after rapid changes', () => {
    const save = vi.fn();
    const schedule = makeDebouncedSaver(save, 600);

    schedule(doc(1));
    schedule(doc(2));
    schedule(doc(3));
    expect(save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].meta.version).toBe(3);
  });
});
