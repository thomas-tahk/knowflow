import { useState } from 'react';
import './PublishModal.css';

interface Props {
  title: string;
  /** Topics already in the library, in display order. */
  topics: string[];
  /** Where this flow sits now — empty for a draft being published for the first time. */
  currentTopic?: string;
  onCancel: () => void;
  onPublish: (topic: string) => Promise<void>;
}

/** Choose the topic a flow is published under. Typing a name that doesn't exist yet creates
 *  that topic — headings come from the flows themselves, so no code change is needed. */
export function PublishModal({ title, topics, currentTopic, onCancel, onPublish }: Props) {
  const [topic, setTopic] = useState(currentTopic ?? topics[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = topic.trim();
  const isNew = trimmed.length > 0 && !topics.includes(trimmed);

  const submit = async () => {
    if (!trimmed) { setError('Pick a topic — a published flow needs a heading to sit under.'); return; }
    setBusy(true); setError(null);
    try {
      await onPublish(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="pub-overlay" onClick={onCancel}>
      <div className="pub-panel" onClick={e => e.stopPropagation()}>
        <h2 className="pub-title">{currentTopic ? 'Move to another topic' : 'Publish to the library'}</h2>
        <p className="pub-sub">
          “{title || 'Untitled'}” {currentTopic
            ? 'is published. Choose the topic it should sit under.'
            : 'will join the shared library — visible to anyone with the link, under the topic you choose.'}
        </p>

        <label className="pub-label" htmlFor="pub-topic">Topic</label>
        <input id="pub-topic" className="pub-input" list="pub-topics" value={topic} autoFocus
          placeholder="e.g. Account & Access"
          onChange={e => { setTopic(e.target.value); setError(null); }}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        <datalist id="pub-topics">
          {topics.map(t => <option key={t} value={t} />)}
        </datalist>
        {isNew && <p className="pub-hint">Creates a new topic called “{trimmed}”.</p>}
        {error && <p className="pub-error">{error}</p>}

        <div className="pub-actions">
          <button className="pub-btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="pub-btn pub-go" onClick={submit} disabled={busy}>
            {busy ? 'Working…' : currentTopic ? 'Move' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
