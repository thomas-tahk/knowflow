import { useState } from 'react';
import type { ValidationError } from '../core/types';
import './ValidationHints.css';

interface Props { errors: ValidationError[]; }

export function ValidationHints({ errors }: Props) {
  const sig = errors.map(e => e.code).join('|');
  const [dismissedSig, setDismissedSig] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (errors.length === 0 || dismissedSig === sig) return null;
  const label = `${errors.length} suggestion${errors.length > 1 ? 's' : ''}`;

  if (!open) {
    return <button className="vh-pill" onClick={() => setOpen(true)} title="Gentle suggestions — safe to ignore">⚠ {label}</button>;
  }

  return (
    <div className="vh-panel">
      <div className="vh-head">
        <span>{label}</span>
        <span className="vh-actions">
          <button onClick={() => setOpen(false)} title="Collapse">–</button>
          <button onClick={() => setDismissedSig(sig)} title="Dismiss">×</button>
        </span>
      </div>
      <ul>{errors.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
    </div>
  );
}
