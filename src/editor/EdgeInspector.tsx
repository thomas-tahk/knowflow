import type { KnowflowDoc } from '../core/types';
import './Inspector.css';

interface Props {
  doc: KnowflowDoc;
  edgeId: string;
  onChangeLabel: (edgeId: string, label: string) => void;
  onDelete: (edgeId: string) => void;
}

export function EdgeInspector({ doc, edgeId, onChangeLabel, onDelete }: Props) {
  const conn = doc.connections.find(c => c.id === edgeId);
  if (!conn) return <p className="inspector-empty">Select a connection to edit it.</p>;

  const from = doc.blocks.find(b => b.id === conn.from)?.text || '(start)';
  const to = doc.blocks.find(b => b.id === conn.to)?.text || '(end)';

  return (
    <div className="inspector">
      <p className="inspector-empty" style={{ marginBottom: 2 }}>{from} → {to}</p>
      <label className="inspector-field">
        <span>Label (e.g. an answer)</span>
        <input
          value={conn.label ?? ''}
          placeholder="Yes / No / …"
          onChange={e => onChangeLabel(edgeId, e.target.value)}
          style={{ font: 'inherit', fontWeight: 500, fontSize: 14, color: '#29281F', border: '1px solid #DED3C2', borderRadius: 8, padding: '8px 10px', background: '#fff' }}
        />
      </label>
      <button className="inspector-delete" onClick={() => onDelete(edgeId)}>Delete connection</button>
    </div>
  );
}
