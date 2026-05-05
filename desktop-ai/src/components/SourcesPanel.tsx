interface Props {
  onClose: () => void;
}

export default function SourcesPanel({ onClose }: Props) {
  return (
    <aside className="sources-panel">
      <header className="sources-header">
        <span>Sources</span>
        <button onClick={onClose}>x</button>
      </header>
      <div className="sources-body">
        <p className="muted">
          Attached files and citations from the current conversation will appear here.
        </p>
      </div>
    </aside>
  );
}
