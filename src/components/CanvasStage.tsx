export function CanvasStage() {
  return (
    <main className="canvas-stage" aria-label="Drawing canvas workspace">
      <div className="canvas-toolbar" aria-label="Canvas scaffold status">
        <span>Canvas stage</span>
        <span>Empty state</span>
      </div>

      <div className="canvas-surface">
        <div className="canvas-grid" aria-hidden="true" />
        <div className="canvas-empty-state">
          <p className="empty-title">Canvas is ready for voice-created shapes.</p>
          <p>
            Future PRs will connect speech recognition, command parsing, and drawing
            operations here.
          </p>
        </div>
      </div>
    </main>
  );
}
