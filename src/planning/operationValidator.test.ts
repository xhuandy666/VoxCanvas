import { describe, expect, it } from "vitest";
import { applyDrawingOperation, createEmptyCanvasState } from "../drawing/drawingState";
import { validateDrawingOperations } from "./operationValidator";

function createCanvasWithCircle() {
  return applyDrawingOperation(createEmptyCanvasState(), {
    type: "create_shape",
    shape: {
      id: "shape-circle-1",
      kind: "circle",
      x: 410,
      y: 230,
      width: 140,
      height: 140,
      rotation: 0,
      style: {
        fill: "#2563eb",
        stroke: "#1d4ed8",
        strokeWidth: 2,
      },
    },
  });
}

describe("validateDrawingOperations", () => {
  it("accepts a valid create shape operation", () => {
    const operation = {
      type: "create_shape",
      shape: {
        id: "shape-rectangle-1",
        kind: "rectangle",
        x: 90,
        y: 60,
        width: 180,
        height: 120,
        rotation: 0,
        style: {
          fill: "#dc2626",
          stroke: "#991b1b",
          strokeWidth: 2,
        },
      },
    };

    const result = validateDrawingOperations([operation], createEmptyCanvasState());

    expect(result.valid).toBe(true);
    expect(result.operations).toEqual([operation]);
    expect(result.errors).toEqual([]);
  });

  it("accepts expanded primitive shape kinds for structured composite drawings", () => {
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
    ];

    const result = validateDrawingOperations(operations, createEmptyCanvasState());

    expect(result.valid).toBe(true);
    expect(result.operations).toEqual(operations);
    expect(result.errors).toEqual([]);
  });

  it("rejects unknown operation types", () => {
    const result = validateDrawingOperations(
      [
        {
          type: "replace_dom",
          selector: "svg",
          html: "<svg />",
        },
      ],
      createEmptyCanvasState(),
    );

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason: "不支持的绘图操作类型",
      },
    ]);
  });

  it("rejects operations that reference a missing shape", () => {
    const result = validateDrawingOperations(
      [
        {
          type: "move_shape",
          shapeId: "missing-shape",
          deltaX: 60,
          deltaY: 0,
        },
      ],
      createCanvasWithCircle(),
    );

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason: "目标图形不存在",
      },
    ]);
  });

  it("rejects invalid shape geometry", () => {
    const result = validateDrawingOperations(
      [
        {
          type: "create_shape",
          shape: {
            id: "shape-bad-circle",
            kind: "circle",
            x: 100,
            y: 100,
            width: -140,
            height: 140,
            rotation: 0,
            style: {},
          },
        },
      ],
      createEmptyCanvasState(),
    );

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason: "图形尺寸必须为有效数字",
      },
    ]);
  });
});
