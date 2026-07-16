import { useState } from 'react';
import { authHeaders } from '../auth/session';
import './FeedbackButton.css';

type State = 'idle' | 'sending' | 'sent' | 'error';

/** Feedback modal → posts a note (plus context) to the team's Discord channel.
 *  Parent-controlled (mount to open) so it is never tied to a menu's lifecycle — rendering it
 *  inside the auto-closing "More" menu previously unmounted it the instant it opened. */
export function FeedbackModal({ onClose, context }: { onClose: () => void; context: string }) {
  const [msg, setMsg] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setState('sending'); setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: msg, context }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Could not send.'); }
      setMsg(''); setState('sent');
    } catch (e) {
      setState('error'); setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="fb-overlay" onClick={onClose}>
      <div className="fb-modal" onClick={e => e.stopPropagation()}>
        <h2 className="fb-title">Send feedback</h2>
        <p className="fb-sub">Goes straight to the team chat — what's working, what's off, what's confusing.</p>
        {state === 'sent' ? (
          <p className="fb-thanks">Thanks — sent! <button className="fb-link" onClick={() => setState('idle')}>Send another</button></p>
        ) : (
          <>
            <textarea className="fb-text" rows={5} value={msg} autoFocus
              placeholder="What did you try, and what happened?"
              onChange={e => setMsg(e.target.value)} />
            {error && <p className="fb-error">{error}</p>}
            <div className="fb-actions">
              <button className="fb-cancel" onClick={onClose}>Close</button>
              <button className="fb-go" disabled={state === 'sending' || !msg.trim()} onClick={send}>
                {state === 'sending' ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
