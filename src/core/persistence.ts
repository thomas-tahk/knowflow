// src/core/persistence.ts
import type { KnowflowDoc, Preset } from './types';

/** Minimal slice of the Web Storage API we depend on. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DocSummary {
  id: string;
  title: string;
  preset: Preset;
  status: 'draft' | 'official';
  updatedAt: string;
}

const KEY = 'knowflow.documents.v1';

export class DocumentStore {
  private storage: KeyValueStorage;

  constructor(storage: KeyValueStorage) {
    this.storage = storage;
  }

  private readAll(): Record<string, KnowflowDoc> {
    const raw = this.storage.getItem(KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, KnowflowDoc>;
    } catch {
      return {};
    }
  }

  private writeAll(map: Record<string, KnowflowDoc>): void {
    this.storage.setItem(KEY, JSON.stringify(map));
  }

  save(doc: KnowflowDoc): void {
    const map = this.readAll();
    map[doc.id] = doc;
    this.writeAll(map);
  }

  load(id: string): KnowflowDoc | null {
    return this.readAll()[id] ?? null;
  }

  remove(id: string): void {
    const map = this.readAll();
    delete map[id];
    this.writeAll(map);
  }

  list(): DocSummary[] {
    return Object.values(this.readAll()).map(d => ({
      id: d.id, title: d.title, preset: d.preset, status: d.meta.status, updatedAt: d.meta.updatedAt,
    }));
  }
}
