import { useEffect, useState } from 'react';
import type { KnowflowDoc } from '../core/types';
import { listVersions, getVersion, getStorageMode, type VersionSummary } from '../data/library';
import { relativeTime } from './relativeTime';
import './HistoryModal.css';

interface Props {
  docId: string;
  onClose: () => void;
  /** Show this version read-only in the canvas (never touches the live doc). */
  onPreview: (doc: KnowflowDoc, archivedAt: string) => void;
  /** Make this version the new current (caller confirms and saves). */
  onRestore: (doc: KnowflowDoc, archivedAt: string) => void;
}

export function HistoryModal({ docId, onClose, onPreview, onRestore }: Props) {
  const unavailable = getStorageMode() !== 'cloud';
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (unavailable) return;
    listVersions(docId)
      .then(setVersions)
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, [docId, unavailable]);

  const open = async (id: number, archivedAt: string, act: (doc: KnowflowDoc, archivedAt: string) => void) => {
    setBusyId(id); setError(null);
    try {
      const doc = await getVersion(id);
      if (!doc) throw new Error('That version could not be loaded.');
      act(doc, archivedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="hist-overlay" onClick={onClose}>
      <div className="hist-panel" onClick={e => e.stopPropagation()}>
        <h2 className="hist-title">Version history</h2>
        <p className="hist-sub">
          A version is kept each time this diagram is edited (bursts within 10 minutes are
          grouped). Restoring archives the current version first, so nothing is ever lost.
        </p>

        {unavailable ? (
          <p className="hist-empty">
            History is unavailable right now — versions live in the shared library, and this
            session isn’t connected to it.
          </p>
        ) : error ? (
          <p className="hist-error">{error}</p>
        ) : versions === null ? (
          <p className="hist-empty">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="hist-empty">No versions yet — they’ll appear here after the next edit.</p>
        ) : (
          <ul className="hist-list">
            {versions.map(v => (
              <li key={v.id} className="hist-row">
                <span className="hist-when" title={new Date(v.archivedAt).toLocaleString()}>
                  {relativeTime(v.archivedAt)}
                </span>
                <span className="hist-name">{v.title || 'Untitled'}</span>
                <button className="hist-btn" disabled={busyId !== null}
                  onClick={() => open(v.id, v.archivedAt, onPreview)}>
                  {busyId === v.id ? '…' : 'Preview'}
                </button>
                <button className="hist-btn hist-restore" disabled={busyId !== null}
                  onClick={() => open(v.id, v.archivedAt, onRestore)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="hist-actions">
          <button className="hist-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
