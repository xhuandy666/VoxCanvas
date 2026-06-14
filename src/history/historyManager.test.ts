import { describe, expect, it } from "vitest";
import { applyDrawingOperation, createEmptyCanvasState } from "../drawing/drawingState";
import {
  canRedo,
  canUndo,
  commitHistoryState,
  createHistoryState,
  redoHistoryState,
  undoHistoryState,
} from "./historyManager";

function createCanvasWithRectangle(id = "shape-1") {
  return applyDrawingOperation(createEmptyCanvasState(), {
    type: "create_shape",
    shape: {
      id,
      kind: "rectangle",
      x: 20,
      y: 30,
      width: 120,
      height: 80,
      rotation: 0,
      style: {
        fill: "#dc2626",
      },
    },
  });
}

function createCanvasWithGeneratedImageLayer() {
  return applyDrawingOperation(createEmptyCanvasState(), {
    type: "create_image_layer",
    layer: {
      id: "image-layer-1",
      prompt: "画一只蓝色的鸟",
      status: "pending",
      x: 170,
      y: 90,
      width: 620,
      height: 420,
      opacity: 1,
      createdAt: "2026-06-14T00:00:00.000Z",
      updatedAt: "2026-06-14T00:00:00.000Z",
    },
  });
}

describe("historyManager", () => {
  it("creates history around the current canvas state", () => {
    const present = createEmptyCanvasState();
    const history = createHistoryState(present);

    expect(history).toEqual({
      past: [],
      present,
      future: [],
    });
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it("commits a new present state and makes it undoable", () => {
    const empty = createEmptyCanvasState();
    const withRectangle = createCanvasWithRectangle();
    const history = commitHistoryState(createHistoryState(empty), withRectangle);

    expect(history.past).toEqual([empty]);
    expect(history.present).toBe(withRectangle);
    expect(history.future).toEqual([]);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
  });

  it("undoes and redoes committed canvas states", () => {
    const empty = createEmptyCanvasState();
    const withRectangle = createCanvasWithRectangle();
    const committed = commitHistoryState(createHistoryState(empty), withRectangle);
    const undone = undoHistoryState(committed);
    const redone = redoHistoryState(undone);

    expect(undone.present).toBe(empty);
    expect(undone.past).toEqual([]);
    expect(undone.future).toEqual([withRectangle]);
    expect(canRedo(undone)).toBe(true);

    expect(redone.present).toBe(withRectangle);
    expect(redone.past).toEqual([empty]);
    expect(redone.future).toEqual([]);
  });

  it("undoes and redoes generated image layer states", () => {
    const empty = createEmptyCanvasState();
    const withImageLayer = createCanvasWithGeneratedImageLayer();
    const committed = commitHistoryState(createHistoryState(empty), withImageLayer);
    const undone = undoHistoryState(committed);
    const redone = redoHistoryState(undone);

    expect(undone.present.imageLayers).toEqual([]);
    expect(undone.present.version).toBe(0);
    expect(redone.present.imageLayers).toHaveLength(1);
    expect(redone.present.imageLayers[0]).toMatchObject({
      id: "image-layer-1",
      status: "pending",
      prompt: "画一只蓝色的鸟",
    });
    expect(redone.present.selectedImageLayerId).toBe("image-layer-1");
  });

  it("clears redo states when committing after an undo", () => {
    const empty = createEmptyCanvasState();
    const first = createCanvasWithRectangle("shape-1");
    const second = createCanvasWithRectangle("shape-2");
    const committed = commitHistoryState(createHistoryState(empty), first);
    const undone = undoHistoryState(committed);
    const next = commitHistoryState(undone, second);

    expect(next.present).toBe(second);
    expect(next.past).toEqual([empty]);
    expect(next.future).toEqual([]);
    expect(canRedo(next)).toBe(false);
  });

  it("does not commit a state object that is already present", () => {
    const present = createEmptyCanvasState();
    const history = createHistoryState(present);

    expect(commitHistoryState(history, present)).toBe(history);
  });
});
