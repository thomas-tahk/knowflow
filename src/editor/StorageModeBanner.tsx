import { useSyncExternalStore } from 'react';
import { getStorageMode, subscribeStorageMode } from '../data/library';
import './StorageModeBanner.css';

/**
 * Tells the user when their work is not reaching the shared library.
 *
 * Without this the fallback is silent: the app keeps saving to localStorage and every
 * signal says "Saved ✓", so people believe their edits reached the team. That matters
 * because Supabase free-tier projects pause after ~7 days idle and do not wake on
 * request — someone has to resume the project by hand.
 */
export function StorageModeBanner() {
  const mode = useSyncExternalStore(subscribeStorageMode, getStorageMode, getStorageMode);

  if (mode === 'cloud') return null;

  // No backend configured at all — expected in local dev, and nothing is at stake.
  if (mode === 'unconfigured') {
    return (
      <div className="smb smb-info" role="status">
        Local mode — no shared library configured. Diagrams are saved in this browser only.
      </div>
    );
  }

  return (
    <div className="smb smb-warn" role="alert">
      <strong>Working offline.</strong> The shared library can’t be reached, so changes are
      saved to this browser only and <strong>the team will not see them</strong>. Reload once
      the connection is back.
    </div>
  );
}
