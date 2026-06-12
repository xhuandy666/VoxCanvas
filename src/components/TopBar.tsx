type TopBarProps = {
  canClear?: boolean;
  canRedo?: boolean;
  canUndo?: boolean;
  onClear?: () => void;
  onRedo?: () => void;
  onUndo?: () => void;
};

export function TopBar({
  canClear = false,
  canRedo = false,
  canUndo = false,
  onClear,
  onRedo,
  onUndo,
}: TopBarProps) {
  return (
    <header className="top-bar" aria-label="VoxCanvas application header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          VC
        </span>
        <div>
          <p className="app-kicker">Voice-first drawing workspace</p>
          <h1>VoxCanvas</h1>
        </div>
      </div>

      <div className="top-actions" aria-label="Canvas history actions">
        <span className="status-pill">History ready</span>
        <button
          className="ghost-button"
          disabled={!canUndo}
          onClick={onUndo}
          type="button"
        >
          Undo
        </button>
        <button
          className="ghost-button"
          disabled={!canRedo}
          onClick={onRedo}
          type="button"
        >
          Redo
        </button>
        <button
          className="ghost-button"
          disabled={!canClear}
          onClick={onClear}
          type="button"
        >
          Clear
        </button>
      </div>
    </header>
  );
}
