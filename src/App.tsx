import { useState } from 'react';
import type { Preset } from './core/types';
import { ALL_PRESETS } from './core/types';
import { getPreset } from './core/presets';
import { DiagramCanvas } from './canvas/DiagramCanvas';
import { FishboneCanvas } from './canvas/FishboneCanvas';
import { SAMPLES } from './canvas/samples';
import './App.css';

export default function App() {
  const [preset, setPreset] = useState<Preset>('flowchart');
  const doc = SAMPLES[preset];

  return (
    <div className="harness">
      <header className="harness-bar">
        <span className="harness-brand">know<b>flow</b></span>
        <span className="harness-title">{doc.title}</span>
        <div className="harness-presets">
          {ALL_PRESETS.map(p => (
            <button
              key={p}
              className={p === preset ? 'on' : ''}
              onClick={() => setPreset(p)}
            >
              {getPreset(p).name}
            </button>
          ))}
        </div>
      </header>
      <div className="harness-canvas">
        {preset === 'fishbone'
          ? <FishboneCanvas doc={doc} />
          : <DiagramCanvas doc={doc} />}
      </div>
    </div>
  );
}
