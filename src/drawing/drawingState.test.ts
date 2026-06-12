import { describe, expect, it } from "vitest";
import {
  applyDrawingOperation,
  createEmptyCanvasState,
  type DrawingOperation,
} from "./drawingState";

describe("drawingState", () => {
  it("creates an empty canvas state with stable defaults", () => {
    const state = createEmptyCanvasState();

    expect(state).toEqual({
      shapes: [],
      selectedShapeId: null,
      lastShapeId: null,
      version: 0,
    });
  });

  it("adds a shape and tracks it as the latest selected shape", () => {
    const state = createEmptyCanvasState();
    const operation = {
      type: "create_shape",
      shape: {
        id: "shape-1",
        kind: "circle",
        x: 120,
        y: 96,
        width: 80,
        height: 80,
        rotation: 0,
        style: {
          fill: "#2563eb",
          stroke: "#1e40af",
          strokeWidth: 2,
        },
      },
    } satisfies DrawingOperation;

    const next = applyDrawingOperation(state, operation);

    expect(next.shapes).toHaveLength(1);
    expect(next.shapes[0]).toEqual(operation.shape);
    expect(next.selectedShapeId).toBe("shape-1");
    expect(next.lastShapeId).toBe("shape-1");
    expect(next.version).toBe(1);
    expect(state.shapes).toHaveLength(0);
  });

  it("stores expanded primitive shape kinds through the same create operation", () => {
    const state = createEmptyCanvasState();
    const operations = [
      {
        type: "create_shape",
        shape: {
          id: "shape-triangle-1",
          kind: "triangle",
          x: 380,
          y: 120,
          width: 200,
          height: 120,
          rotation: 0,
          style: {
            fill: "#dc2626",
            stroke: "#991b1b",
            strokeWidth: 2,
          },
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "shape-diamond-1",
          kind: "diamond",
          x: 390,
          y: 260,
          width: 180,
          height: 120,
          rotation: 0,
          style: {
            fill: "#facc15",
            stroke: "#ca8a04",
            strokeWidth: 2,
          },
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "shape-ellipse-1",
          kind: "ellipse",
          x: 390,
          y: 420,
          width: 180,
          height: 96,
          rotation: 0,
          style: {
            fill: "#16a34a",
            stroke: "#15803d",
            strokeWidth: 2,
          },
        },
      },
    ] satisfies DrawingOperation[];

    const next = operations.reduce(applyDrawingOperation, state);

    expect(next.shapes.map((shape) => shape.kind)).toEqual([
      "triangle",
      "diamond",
      "ellipse",
    ]);
    expect(next.selectedShapeId).toBe("shape-ellipse-1");
    expect(next.lastShapeId).toBe("shape-ellipse-1");
    expect(next.version).toBe(3);
  });

  it("does not keep external references to created shapes", () => {
    const state = createEmptyCanvasState();
    const operation = {
      type: "create_shape",
      shape: {
        id: "shape-1",
        kind: "circle",
        x: 120,
        y: 96,
        width: 80,
        height: 80,
        rotation: 0,
        style: {
          fill: "#2563eb",
          stroke: "#1e40af",
        },
      },
    } satisfies DrawingOperation;

    const next = applyDrawingOperation(state, operation);
    operation.shape.x = 999;
    operation.shape.style.fill = "#ef4444";

    expect(next.shapes[0]).toMatchObject({
      x: 120,
      style: {
        fill: "#2563eb",
        stroke: "#1e40af",
      },
    });
  });

  it("keeps shape ids unique when creating shapes", () => {
    const state = applyDrawingOperation(createEmptyCanvasState(), {
      type: "create_shape",
      shape: {
        id: "shape-1",
        kind: "circle",
        x: 120,
        y: 96,
        width: 80,
        height: 80,
        rotation: 0,
        style: {
          fill: "#2563eb",
        },
      },
    });

    const next = applyDrawingOperation(state, {
      type: "create_shape",
      shape: {
        id: "shape-1",
        kind: "rectangle",
        x: 20,
        y: 30,
        width: 140,
        height: 90,
        rotation: 0,
        style: {
          fill: "#facc15",
        },
      },
    });

    expect(next).toBe(state);
    expect(next.shapes).toHaveLength(1);
    expect(next.shapes[0].kind).toBe("circle");
  });

  it("updates shape style without dropping geometry", () => {
    const state = applyDrawingOperation(createEmptyCanvasState(), {
      type: "create_shape",
      shape: {
        id: "shape-1",
        kind: "rectangle",
        x: 20,
        y: 30,
        width: 140,
        height: 90,
        rotation: 0,
        style: {
          fill: "#facc15",
          stroke: "#92400e",
          strokeWidth: 2,
        },
      },
    });

    const next = applyDrawingOperation(state, {
      type: "update_shape",
      shapeId: "shape-1",
      patch: {
        style: {
          fill: "#ef4444",
        },
      },
    });

    expect(next.shapes[0]).toMatchObject({
      id: "shape-1",
      kind: "rectangle",
      x: 20,
      y: 30,
      width: 140,
      height: 90,
      style: {
        fill: "#ef4444",
        stroke: "#92400e",
        strokeWidth: 2,
      },
    });
    expect(next.version).toBe(2);
  });

  it("moves a shape by a relative offset", () => {
    const state = applyDrawingOperation(createEmptyCanvasState(), {
      type: "create_shape",
      shape: {
        id: "shape-1",
        kind: "line",
        x: 10,
        y: 12,
        width: 100,
        height: 0,
        rotation: 0,
        style: {
          stroke: "#111827",
          strokeWidth: 3,
        },
      },
    });

    const next = applyDrawingOperation(state, {
      type: "move_shape",
      shapeId: "shape-1",
      deltaX: 16,
      deltaY: -4,
    });

    expect(next.shapes[0]).toMatchObject({ x: 26, y: 8 });
    expect(next.selectedShapeId).toBe("shape-1");
    expect(next.lastShapeId).toBe("shape-1");
    expect(next.version).toBe(2);
  });

  it("deletes a shape and clears stale selection references", () => {
    const withShape = applyDrawingOperation(createEmptyCanvasState(), {
      type: "create_shape",
      shape: {
        id: "shape-1",
        kind: "text",
        x: 40,
        y: 50,
        width: 180,
        height: 40,
        rotation: 0,
        text: "Hello",
        style: {
          fill: "#111827",
        },
      },
    });

    const next = applyDrawingOperation(withShape, {
      type: "delete_shape",
      shapeId: "shape-1",
    });

    expect(next.shapes).toEqual([]);
    expect(next.selectedShapeId).toBeNull();
    expect(next.lastShapeId).toBeNull();
    expect(next.version).toBe(2);
  });

  it("clears the canvas with a versioned operation", () => {
    const withShape = applyDrawingOperation(createEmptyCanvasState(), {
      type: "create_shape",
      shape: {
        id: "shape-1",
        kind: "arrow",
        x: 0,
        y: 0,
        width: 160,
        height: 80,
        rotation: 0,
        style: {
          stroke: "#0f766e",
          strokeWidth: 2,
        },
      },
    });

    const next = applyDrawingOperation(withShape, { type: "clear_canvas" });

    expect(next).toEqual({
      shapes: [],
      selectedShapeId: null,
      lastShapeId: null,
      version: 2,
    });
  });

  it("returns the same state for operations that target missing shapes", () => {
    const state = createEmptyCanvasState();

    const afterMove = applyDrawingOperation(state, {
      type: "move_shape",
      shapeId: "missing",
      deltaX: 10,
      deltaY: 0,
    });
    const afterUpdate = applyDrawingOperation(state, {
      type: "update_shape",
      shapeId: "missing",
      patch: {
        x: 40,
      },
    });
    const afterDelete = applyDrawingOperation(state, {
      type: "delete_shape",
      shapeId: "missing",
    });

    expect(afterMove).toBe(state);
    expect(afterUpdate).toBe(state);
    expect(afterDelete).toBe(state);
    expect(state.version).toBe(0);
  });
});
