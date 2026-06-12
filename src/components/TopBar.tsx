export function TopBar() {
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

      <div className="top-actions" aria-label="Future canvas actions">
        <span className="status-pill">Prototype scaffold</span>
        <button className="ghost-button" type="button" disabled>
          Undo
        </button>
        <button className="ghost-button" type="button" disabled>
          Redo
        </button>
        <button className="ghost-button" type="button" disabled>
          Clear
        </button>
      </div>
    </header>
  );
}
