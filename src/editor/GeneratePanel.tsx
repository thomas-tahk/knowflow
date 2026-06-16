import { useState } from 'react';
import type { KnowflowDoc, Preset } from '../core/types';
import { ALL_PRESETS } from '../core/types';
import { getPreset } from '../core/presets';
import { authHeaders } from '../auth/session';
import './GeneratePanel.css';

interface Props {
  defaultPreset: Preset;
  onClose: () => void;
  onGenerated: (doc: KnowflowDoc) => void;
}

interface ImagePayload { mediaType: string; dataBase64: string; }

function readImage(file: File): Promise<ImagePayload> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result);
      const comma = url.indexOf(',');
      const mediaType = url.slice(5, url.indexOf(';'));
      resolve({ mediaType, dataBase64: url.slice(comma + 1) });
    };
    r.onerror = () => reject(new Error('Could not read that image.'));
    r.readAsDataURL(file);
  });
}

export function GeneratePanel({ defaultPreset, onClose, onGenerated }: Props) {
  const [preset, setPreset] = useState<Preset>(defaultPreset);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imageName, setImageName] = useState<string | null>(null);
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async (file: File | undefined) => {
    if (!file) { setImage(null); setImageName(null); return; }
    try { setImage(await readImage(file)); setImageName(file.name); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const generate = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ text, preset, title, image: image ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed.');
      onGenerated(json as KnowflowDoc);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const canGenerate = !busy && (text.trim().length > 0 || image !== null);

  return (
    <div className="gen-overlay" onClick={onClose}>
      <div className="gen-panel" onClick={e => e.stopPropagation()}>
        <h2 className="gen-title">Generate a diagram with AI</h2>
        <p className="gen-sub">Use a prompt, an image, or both — whatever you have.</p>

        <label className="gen-field">
          <span>Diagram type</span>
          <select value={preset} onChange={e => setPreset(e.target.value as Preset)}>
            {ALL_PRESETS.map(p => <option key={p} value={p}>{getPreset(p).name}</option>)}
          </select>
        </label>

        <label className="gen-field">
          <span>Title (optional)</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Handling disabled accounts" />
        </label>

        <label className="gen-field">
          <span>Describe what you want, or paste notes / KB text</span>
          <textarea rows={7} value={text} onChange={e => setText(e.target.value)}
            placeholder={"e.g. “A flowchart for unlocking a disabled AD account: check if it's locked → unlock; otherwise reset the password, then re-enable in AD.”\n\nOr just paste raw notes and let AI structure them."} />
        </label>

        <label className="gen-field">
          <span>Add an image too (optional) — a photo of text or a sketch</span>
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={e => pickImage(e.target.files?.[0])} />
          {imageName && <span className="gen-imagename">{imageName}</span>}
        </label>

        {error && <p className="gen-error">{error}</p>}

        <div className="gen-actions">
          <button className="gen-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="gen-go" onClick={generate} disabled={!canGenerate}>
            {busy ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
