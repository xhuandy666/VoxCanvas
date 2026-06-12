import { describe, expect, it } from "vitest";
import { applyDrawingOperation, createEmptyCanvasState } from "../drawing/drawingState";
import { createCommandTraceState } from "./commandTrace";

describe("createCommandTraceState", () => {
  it("maps parser output into command trace presentation state", () => {
    const traceState = createCommandTraceState("清空画布");

    expect(traceState).toEqual({
      parsedIntent: "clear_canvas",
      operationPreview: ["clear canvas"],
      feedbackLog: ["已解析为清空画布操作"],
    });
  });

  it("keeps unsupported commands visible without operations", () => {
    const traceState = createCommandTraceState("把它向右移动一点");

    expect(traceState).toEqual({
      parsedIntent: "unknown",
      operationPreview: ["no operation preview"],
      feedbackLog: ["没有可引用的对象，请先创建图形"],
    });
  });

  it("maps object-reference parser output into command trace state", () => {
    const canvasState = applyDrawingOperation(createEmptyCanvasState(), {
      type: "create_shape",
      shape: {
        id: "shape-1",
        kind: "circle",
        x: 410,
        y: 230,
        width: 140,
        height: 140,
        rotation: 0,
        style: {
          fill: "#2563eb",
        },
      },
    });
    const traceState = createCommandTraceState("把它向右移动一点", { canvasState });

    expect(traceState).toEqual({
      parsedIntent: "move_shape",
      operationPreview: ["move shape: shape-1, dx: 60, dy: 0"],
      feedbackLog: ["已解析为移动最近对象操作"],
    });
  });
});
