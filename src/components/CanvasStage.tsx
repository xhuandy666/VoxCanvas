import type { CanvasState } from "../drawing/drawingState";
import { CanvasRenderer } from "./CanvasRenderer";

type CanvasStageProps = {
  state: CanvasState;
};

export function CanvasStage({ state }: CanvasStageProps) {
  return (
    <main className="canvas-stage" aria-label="Drawing canvas workspace">
      <div className="canvas-toolbar" aria-label="Canvas render status">
        <span>Canvas stage</span>
        <span>
          {state.shapes.length} shapes / {state.imageLayers.length} image layers / v
          {state.version}
        </span>
      </div>

      <div className="canvas-surface">
        <div className="canvas-grid" aria-hidden="true" />
        <CanvasRenderer state={state} />
      </div>
    </main>
  );
}
