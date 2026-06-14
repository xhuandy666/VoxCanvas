import { describe, expect, it } from "vitest";
import { applyDrawingOperation, createEmptyCanvasState } from "../drawing/drawingState";
import { validateDrawingOperations } from "../planning/operationValidator";
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
          x: 730,
          y: 430,
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

  it("corrects common speech homophone 园 to circle on the local fast path", () => {
    const result = parseCommand("画一个蓝色的园", {
      createShapeId: () => "shape-circle-1",
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("create_shape");
    expect(result.operations).toMatchObject([
      {
        type: "create_shape",
        shape: {
          id: "shape-circle-1",
          kind: "circle",
          style: {
            fill: "#2563eb",
            stroke: "#1d4ed8",
          },
        },
      },
    ]);
    expect(result.feedback).toEqual([
      "已将“园”理解为圆形",
      "已解析为创建圆形操作",
    ]);
  });

  it("expands simple numbered shape creation commands", () => {
    const result = parseCommand("画两个圆", {
      createShapeId: (kind, _transcript, index = 0) => `shape-${kind}-${index + 1}`,
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("create_shape");
    expect(result.operations).toHaveLength(2);
    expect(result.operations).toMatchObject([
      {
        type: "create_shape",
        shape: {
          id: "shape-circle-1",
          kind: "circle",
          x: 660,
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "shape-circle-2",
          kind: "circle",
          x: 800,
        },
      },
    ]);
    expect(result.operationPreview).toEqual([
      "add shape: circle, color: blue, count: 2",
    ]);
    expect(validateDrawingOperations(result.operations, createEmptyCanvasState()).valid).toBe(
      true,
    );
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
          x: 190,
          y: 120,
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

  it("parses expanded primitive creation commands for composite sketches", () => {
    expect(
      parseCommand("画一个红色三角形", {
        createShapeId: () => "shape-triangle-1",
      }).operations[0],
    ).toMatchObject({
      type: "create_shape",
      shape: {
        id: "shape-triangle-1",
        kind: "triangle",
        width: 180,
        height: 140,
        style: {
          fill: "#dc2626",
          stroke: "#991b1b",
        },
      },
    });

    expect(
      parseCommand("画一个黄色菱形", {
        createShapeId: () => "shape-diamond-1",
      }).operations[0],
    ).toMatchObject({
      type: "create_shape",
      shape: {
        id: "shape-diamond-1",
        kind: "diamond",
        width: 160,
        height: 120,
        style: {
          fill: "#facc15",
          stroke: "#ca8a04",
        },
      },
    });

    expect(
      parseCommand("画一个绿色椭圆", {
        createShapeId: () => "shape-ellipse-1",
      }).operations[0],
    ).toMatchObject({
      type: "create_shape",
      shape: {
        id: "shape-ellipse-1",
        kind: "ellipse",
        width: 180,
        height: 96,
        style: {
          fill: "#16a34a",
          stroke: "#15803d",
        },
      },
    });
  });

  it("expands a house sketch command into legal create operations", () => {
    const result = parseCommand(
      "画一座房子，有红色屋顶、黄色墙体、两个窗户和一扇门",
      {
        createShapeId: (kind) => `voice-${kind}-1`,
      },
    );

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("create_template");
    expect(result.operations).toHaveLength(5);
    expect(result.operationPreview).toEqual([
      "expand template: house, shapes: wall, roof, window-left, window-right, door",
    ]);
    expect(result.feedback).toEqual(["已展开房子草图模板"]);
    expect(validateDrawingOperations(result.operations, createEmptyCanvasState()).valid).toBe(
      true,
    );
    expect(result.operations.slice(0, 5)).toMatchObject([
      {
        type: "create_shape",
        shape: {
          id: "voice-rectangle-1-wall",
          kind: "rectangle",
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "voice-triangle-1-roof",
          kind: "triangle",
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "voice-rectangle-1-window-left",
          kind: "rectangle",
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "voice-rectangle-1-window-right",
          kind: "rectangle",
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "voice-rectangle-1-door",
          kind: "rectangle",
        },
      },
    ]);
  });

  it("expands a flowchart command into legal create operations", () => {
    const result = parseCommand("画一个流程图", {
      createShapeId: (kind) => `voice-${kind}-1`,
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("create_template");
    expect(result.operations).toHaveLength(8);
    expect(result.operationPreview).toEqual([
      "expand template: flowchart, shapes: start, decision, process, labels",
    ]);
    expect(result.feedback).toEqual(["已展开流程图模板"]);
    expect(validateDrawingOperations(result.operations, createEmptyCanvasState()).valid).toBe(
      true,
    );
    expect(result.operations.slice(0, 5)).toMatchObject([
      {
        type: "create_shape",
        shape: {
          id: "voice-ellipse-1-start",
          kind: "ellipse",
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "voice-arrow-1-start-to-decision",
          kind: "arrow",
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "voice-diamond-1-decision",
          kind: "diamond",
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "voice-arrow-1-decision-to-process",
          kind: "arrow",
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "voice-rectangle-1-process",
          kind: "rectangle",
        },
      },
    ]);
  });

  it("parses clear canvas commands without creating shapes", () => {
    const result = parseCommand("清空画布");

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("clear_canvas");
    expect(result.operations).toEqual([{ type: "clear_canvas" }]);
    expect(result.operationPreview).toEqual(["clear canvas"]);
  });

  it("parses natural reset expressions as clear canvas commands", () => {
    for (const transcript of ["重新来", "回到最初状态", "全部清掉"]) {
      const result = parseCommand(transcript);

      expect(result.status).toBe("matched");
      expect(result.intent).toBe("clear_canvas");
      expect(result.operations).toEqual([{ type: "clear_canvas" }]);
    }
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

  it("moves the most recent object for implicit upward movement commands", () => {
    const result = parseCommand("往上一", {
      canvasState: createReferenceCanvasState(),
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("move_shape");
    expect(result.operations).toEqual([
      {
        type: "move_shape",
        shapeId: "shape-circle-1",
        deltaX: 0,
        deltaY: -60,
      },
    ]);
    expect(result.operationPreview).toEqual([
      "move shape: shape-circle-1, dx: 0, dy: -60",
    ]);
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

  it("deletes an explicit shape type without recreating that shape", () => {
    const canvasState = applyDrawingOperation(
      applyDrawingOperation(createEmptyCanvasState(), {
        type: "create_shape",
        shape: {
          id: "shape-triangle-1",
          kind: "triangle",
          x: 390,
          y: 230,
          width: 180,
          height: 140,
          rotation: 0,
          style: {
            fill: "#2563eb",
            stroke: "#1d4ed8",
            strokeWidth: 2,
          },
        },
      }),
      {
        type: "create_shape",
        shape: {
          id: "shape-square-1",
          kind: "rectangle",
          x: 390,
          y: 240,
          width: 180,
          height: 120,
          rotation: 0,
          style: {
            fill: "#2563eb",
            stroke: "#1d4ed8",
            strokeWidth: 2,
          },
        },
      },
    );

    const result = parseCommand("删除正方形", {
      canvasState,
    });

    expect(result.status).toBe("matched");
    expect(result.intent).toBe("delete_shape");
    expect(result.operations).toEqual([
      {
        type: "delete_shape",
        shapeId: "shape-square-1",
      },
    ]);
    expect(result.operations).not.toContainEqual(
      expect.objectContaining({
        type: "create_shape",
      }),
    );
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
