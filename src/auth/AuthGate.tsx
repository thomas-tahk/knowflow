import { useState, type ReactNode, type FormEvent } from 'react';
import { setPassword } from './session';
import './AuthGate.css';

/** Shows the team-password screen in production until authenticated. No gate in local dev. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => import.meta.env.DEV || !!sessionStorage.getItem('kf_pw'));
  if (authed) return <>{children}</>;
  return <Login onSuccess={() => setAuthed(true)} />;
}

function Login({ onSuccess }: { onSuccess: () => void }) {
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
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">know<b>flow</b></div>
        <p className="auth-sub">Enter the team password to continue.</p>
        <input className="auth-input" type="password" value={pw} autoFocus placeholder="Team password"
          onChange={e => setPw(e.target.value)} />
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-go" disabled={busy || !pw}>{busy ? 'Checking…' : 'Enter'}</button>
      </form>
    </div>
  );
}
