import './CanvasCaption.css';

interface Props {
  title: string;
  description: string;
  onTitle: (text: string) => void;
  onDescription: (text: string) => void;
}

/**
 * Editable title + description drawn on the canvas (so it's included in PNG/PDF export).
 * Uncontrolled contentEditable committed on blur — keyed by doc id at the call site so it
 * resets when a different diagram loads. textContent renders reliably in html-to-image.
 */
export function CanvasCaption({ title, description, onTitle, onDescription }: Props) {
  return (
    <div className="caption">
      <div
        className="caption-title"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder="Untitled diagram"
        onBlur={e => onTitle(e.currentTarget.textContent ?? '')}
      >
        {title}
      </div>
      <div
        className="caption-desc"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder="Add a description — what is this and when do you use it?"
        onBlur={e => onDescription(e.currentTarget.textContent ?? '')}
      >
        {description}
      </div>
    </div>
  );
}
