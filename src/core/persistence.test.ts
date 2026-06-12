// src/core/persistence.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentStore } from './persistence';
import { createDoc } from './createDoc';
import type { Clock } from './ids';

class FakeStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

const clock: Clock = { newId: (() => { let n = 0; return () => `id${++n}`; })(), nowIso: () => '2026-06-12T00:00:00.000Z' };

describe('DocumentStore', () => {
  let store: DocumentStore;
  beforeEach(() => { store = new DocumentStore(new FakeStorage()); });

  it('saves and loads a document by id', () => {
    const d = createDoc('flowchart', 'A', clock);
    store.save(d);
    expect(store.load(d.id)).toEqual(d);
  });

  it('lists saved documents as summaries', () => {
    store.save(createDoc('flowchart', 'A', clock));
    store.save(createDoc('fishbone', 'B', clock));
    const list = store.list();
    expect(list).toHaveLength(2);
    expect(list[0]).toHaveProperty('title');
    expect(list[0]).toHaveProperty('preset');
  });

  it('returns null for a missing id', () => {
    expect(store.load('nope')).toBeNull();
  });

  it('removes a document', () => {
    const d = createDoc('flowchart', 'A', clock);
    store.save(d);
    store.remove(d.id);
    expect(store.load(d.id)).toBeNull();
  });
});
