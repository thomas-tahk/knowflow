import { useCallback, useState } from 'react';
import type { KnowflowDoc } from '../core/types';

interface History { past: KnowflowDoc[]; present: KnowflowDoc; future: KnowflowDoc[]; }

const LIMIT = 100;

/** Undo/redo-aware document state. `setDoc` records history; `resetDoc` clears it (new/opened doc). */
export function useDocHistory(initial: KnowflowDoc) {
  const [h, setH] = useState<History>({ past: [], present: initial, future: [] });

  const setDoc = useCallback((next: KnowflowDoc | ((prev: KnowflowDoc) => KnowflowDoc)) => {
    setH(cur => {
      const value = typeof next === 'function' ? (next as (p: KnowflowDoc) => KnowflowDoc)(cur.present) : next;
      if (value === cur.present) return cur;
      return { past: [...cur.past, cur.present].slice(-LIMIT), present: value, future: [] };
    });
  }, []);

  const resetDoc = useCallback((value: KnowflowDoc) => setH({ past: [], present: value, future: [] }), []);

  const undo = useCallback(() => setH(cur => {
    if (!cur.past.length) return cur;
    const present = cur.past[cur.past.length - 1];
    return { past: cur.past.slice(0, -1), present, future: [cur.present, ...cur.future] };
  }), []);

  const redo = useCallback(() => setH(cur => {
    if (!cur.future.length) return cur;
    const present = cur.future[0];
    return { past: [...cur.past, cur.present], present, future: cur.future.slice(1) };
  }), []);

  return { doc: h.present, setDoc, resetDoc, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
