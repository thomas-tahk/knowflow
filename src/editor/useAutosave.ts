import { useEffect, useRef, useState } from 'react';
import type { KnowflowDoc } from '../core/types';

export type SaveStatus = 'idle' | 'saving' | 'saved';

/** Pure debouncer: only the last call within `delay` actually fires `save`. */
export function makeDebouncedSaver(save: (doc: KnowflowDoc) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (doc: KnowflowDoc) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => save(doc), delay);
  };
}

/** Debounced autosave of the doc via `save` (sync or async). Returns a status for the toolbar. */
export function useAutosave(doc: KnowflowDoc, save: (doc: KnowflowDoc) => void | Promise<void>, delay = 600): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveRef = useRef(save);
  saveRef.current = save;

  const saverRef = useRef<((doc: KnowflowDoc) => void) | null>(null);
  if (!saverRef.current) {
    saverRef.current = makeDebouncedSaver(async (d) => {
      try { await saveRef.current(d); setStatus('saved'); } catch { setStatus('idle'); }
    }, delay);
  }
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; } // don't re-save the freshly-loaded doc on mount
    setStatus('saving');
    saverRef.current!(doc);
  }, [doc]);

  return status;
}
