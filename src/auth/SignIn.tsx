import { useState, type FormEvent } from 'react';
import { setPassword } from './session';
import './SignIn.css';

/** The team-password prompt, now a dismissable dialog over the app rather than a wall
 *  in front of it: anyone may read, and signing in is what unlocks editing. */
export function SignInDialog({ onClose }: { onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Incorrect password.'); }
      setPassword(pw);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth" role="dialog" aria-modal="true" aria-label="Sign in to edit"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">know<b>flow</b></div>
        <p className="auth-sub">Enter the team password to edit. Reading needs no password.</p>
        <input className="auth-input" type="password" value={pw} autoFocus placeholder="Team password"
          onChange={e => setPw(e.target.value)} />
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-go" disabled={busy || !pw}>{busy ? 'Checking…' : 'Sign in'}</button>
        <button type="button" className="auth-cancel" onClick={onClose}>Keep reading instead</button>
      </form>
    </div>
  );
}
