import { describe, expect, it } from "vitest";
import { applyDrawingOperation, createEmptyCanvasState } from "../drawing/drawingState";
import { createSemanticPlan } from "./semanticPlanner";

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

describe("createSemanticPlan", () => {
  it("returns a matched structured drawing plan for commands handled by rules", () => {
    const plan = createSemanticPlan("画一个蓝色圆形", {
      createShapeId: (kind) => `shape-${kind}-1`,
    });

    expect(plan).toMatchObject({
      status: "matched",
      route: "structured_drawing",
      intent: "create_shape",
      source: "rule_parser",
      confidence: 1,
      normalizedTranscript: "画一个蓝色圆形",
      operationPreview: ["add shape: circle, color: blue"],
      feedback: ["已解析为创建圆形操作"],
    });
    expect(plan.operations).toEqual([
      {
        type: "create_shape",
        shape: expect.objectContaining({
          id: "shape-circle-1",
          kind: "circle",
          style: expect.objectContaining({
            fill: "#2563eb",
          }),
        }),
      },
    ]);
  });

  it("returns unsupported when no safe local or mock semantic route exists", () => {
    const plan = createSemanticPlan("画一只蓝色的鸟");

    expect(plan).toMatchObject({
      status: "unsupported",
      route: "unsupported",
      intent: "unknown",
      source: "mock_semantic_planner",
      operations: [],
      operationPreview: [],
      feedback: ["语义规划基础已就绪，但当前没有可安全执行的结构化计划"],
    });
  });

  it("returns needs_clarification when a reference command has no target", () => {
    const plan = createSemanticPlan("把它放大", {
      canvasState: createEmptyCanvasState(),
    });

    expect(plan).toMatchObject({
      status: "needs_clarification",
      route: "clarification",
      intent: "clarify_reference",
      source: "mock_semantic_planner",
      operations: [],
      operationPreview: [],
      feedback: ["需要澄清：我还没有找到可引用的对象。"],
      clarification: {
        reason: "missing_reference",
        question: "你想先创建一个图形，还是重新描述要编辑的对象？",
        suggestions: ["先画一个圆形", "重新描述目标对象"],
      },
    });
  });

  it("blocks illegal planner operations before they can execute", () => {
    const plan = createSemanticPlan("把不存在的图形向右移动", {
      canvasState: createCanvasWithCircle(),
      semanticPlanner: () => ({
        status: "matched",
        route: "structured_drawing",
        intent: "move_shape",
        confidence: 0.82,
        normalizedTranscript: "把不存在的图形向右移动",
        operations: [
          {
            type: "move_shape",
            shapeId: "missing-shape",
            deltaX: 60,
            deltaY: 0,
          },
        ],
        operationPreview: ["move shape: missing-shape, dx: 60, dy: 0"],
        feedback: ["语义规划生成了移动操作"],
      }),
    });

    expect(plan).toMatchObject({
      status: "unsupported",
      route: "unsupported",
      intent: "unknown",
      operations: [],
      operationPreview: [],
      feedback: ["语义规划结果包含非法操作，已阻止执行：目标图形不存在"],
    });
  });
});
