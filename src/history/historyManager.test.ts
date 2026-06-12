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
