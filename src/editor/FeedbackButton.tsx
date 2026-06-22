import { useState } from 'react';
import { authHeaders } from '../auth/session';
import './FeedbackButton.css';

type State = 'idle' | 'sending' | 'sent' | 'error';

/** 'Send feedback' button → posts a note (plus context) to the team's Google Chat space. */
export function FeedbackButton(
  { context, className = 'tbtn', label = '💬 Feedback', onOpen }:
  { context: string; className?: string; label?: string; onOpen?: () => void },
) {
  const [open, setOpen] = useState(false);
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
    <>
      <button className={className} onClick={() => { onOpen?.(); setOpen(true); setState('idle'); setError(null); }}>{label}</button>
      {open && (
        <div className="fb-overlay" onClick={() => setOpen(false)}>
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
                  <button className="fb-cancel" onClick={() => setOpen(false)}>Close</button>
                  <button className="fb-go" disabled={state === 'sending' || !msg.trim()} onClick={send}>
                    {state === 'sending' ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
