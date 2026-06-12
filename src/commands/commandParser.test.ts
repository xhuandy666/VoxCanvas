import { describe, expect, it } from "vitest";
import { applyDrawingOperation, createEmptyCanvasState } from "../drawing/drawingState";
import { parseCommand } from "./commandParser";

function createReferenceCanvasState() {
  const withRectangle = applyDrawingOperation(createEmptyCanvasState(), {
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
  });

  return applyDrawingOperation(withRectangle, {
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

describe("parseCommand", () => {
  it("parses a colored circle creation command", () => {
    const result = parseCommand("画一个蓝色圆形", {
      createShapeId: () => "shape-circle-1",
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("create_shape");
    expect(result.operations).toEqual([
      {
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
      },
    ]);
    expect(result.operationPreview).toEqual(["add shape: circle, color: blue"]);
  });

  it("parses a positioned rectangle creation command", () => {
    const result = parseCommand("在左上角画一个红色矩形", {
      createShapeId: () => "shape-rectangle-1",
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("create_shape");
    expect(result.operations).toEqual([
      {
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
      },
    ]);
    expect(result.operationPreview).toEqual([
      "add shape: rectangle, color: red, position: top-left",
    ]);
  });

  it("parses line, arrow, and text creation commands", () => {
    expect(
      parseCommand("画一条绿色线条", {
        createShapeId: () => "shape-line-1",
      }).operations[0],
    ).toMatchObject({
      type: "create_shape",
      shape: {
        id: "shape-line-1",
        kind: "line",
        style: {
          stroke: "#15803d",
        },
      },
    });

    expect(
      parseCommand("画一个黑色箭头", {
        createShapeId: () => "shape-arrow-1",
      }).operations[0],
    ).toMatchObject({
      type: "create_shape",
      shape: {
        id: "shape-arrow-1",
        kind: "arrow",
        style: {
          stroke: "#111827",
        },
      },
    });

    expect(
      parseCommand("添加文字 你好 VoxCanvas", {
        createShapeId: () => "shape-text-1",
      }).operations[0],
    ).toMatchObject({
      type: "create_shape",
      shape: {
        id: "shape-text-1",
        kind: "text",
        text: "你好 VoxCanvas",
      },
    });
  });

  it("parses clear canvas commands without creating shapes", () => {
    const result = parseCommand("清空画布");

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("clear_canvas");
    expect(result.operations).toEqual([{ type: "clear_canvas" }]);
    expect(result.operationPreview).toEqual(["clear canvas"]);
  });

  it("parses undo and redo commands without drawing operations", () => {
    const undo = parseCommand("撤销");
    const redo = parseCommand("重做");

    expect(undo.status).toBe("matched");
    expect(undo.intent).toBe("undo");
    expect(undo.operations).toEqual([]);
    expect(undo.operationPreview).toEqual(["undo last operation"]);
    expect(undo.feedback).toEqual(["已解析为撤销操作"]);

    expect(redo.status).toBe("matched");
    expect(redo.intent).toBe("redo");
    expect(redo.operations).toEqual([]);
    expect(redo.operationPreview).toEqual(["redo last undone operation"]);
    expect(redo.feedback).toEqual(["已解析为重做操作"]);
  });

  it("moves the most recent referenced object", () => {
    const result = parseCommand("把它向右移动一点", {
      canvasState: createReferenceCanvasState(),
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("move_shape");
    expect(result.operations).toEqual([
      {
        type: "move_shape",
        shapeId: "shape-circle-1",
        deltaX: 60,
        deltaY: 0,
      },
    ]);
    expect(result.operationPreview).toEqual([
      "move shape: shape-circle-1, dx: 60, dy: 0",
    ]);
    expect(result.feedback).toEqual(["已解析为移动最近对象操作"]);
  });

  it("updates a referenced shape by type", () => {
    const result = parseCommand("把刚才的圆变成红色", {
      canvasState: createReferenceCanvasState(),
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("update_shape");
    expect(result.operations).toEqual([
      {
        type: "update_shape",
        shapeId: "shape-circle-1",
        patch: {
          style: {
            fill: "#dc2626",
            stroke: "#991b1b",
          },
        },
      },
    ]);
    expect(result.operationPreview).toEqual([
      "update shape: shape-circle-1, color: red",
    ]);
  });

  it("resizes a referenced shape by type", () => {
    const result = parseCommand("把刚才的圆变大", {
      canvasState: createReferenceCanvasState(),
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("update_shape");
    expect(result.operations).toEqual([
      {
        type: "update_shape",
        shapeId: "shape-circle-1",
        patch: {
          x: 396,
          y: 216,
          width: 168,
          height: 168,
        },
      },
    ]);
    expect(result.operationPreview).toEqual([
      "resize shape: shape-circle-1, scale: 1.2",
    ]);
  });

  it("deletes the most recent shape matching an explicit reference type", () => {
    const result = parseCommand("删除刚才的矩形", {
      canvasState: createReferenceCanvasState(),
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("delete_shape");
    expect(result.operations).toEqual([
      {
        type: "delete_shape",
        shapeId: "shape-rectangle-1",
      },
    ]);
    expect(result.operationPreview).toEqual(["delete shape: shape-rectangle-1"]);
  });

  it("keeps object-reference commands unsupported when there is no matching target", () => {
    const result = parseCommand("把刚才的圆变大", {
      canvasState: createEmptyCanvasState(),
    });

    expect(result.status).toBe("unsupported");
    expect(result.intent).toBe("unknown");
    expect(result.operations).toEqual([]);
    expect(result.feedback).toEqual(["没有找到可引用的圆形"]);
  });
});
