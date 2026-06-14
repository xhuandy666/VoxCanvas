import { describe, expect, it } from "vitest";
import { applyDrawingOperation, createEmptyCanvasState } from "../drawing/drawingState";
import { createSemanticPlan, createSemanticPlanAsync } from "./semanticPlanner";

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

function createCanvasWithGeneratedImageLayer() {
  return applyDrawingOperation(createEmptyCanvasState(), {
    type: "create_image_layer",
    layer: {
      id: "image-layer-bird-1",
      prompt: "画一只蓝色的鸟",
      status: "pending",
      x: 170,
      y: 90,
      width: 620,
      height: 420,
      opacity: 1,
      model: "mock-image-generation",
      createdAt: "2026-06-14T00:00:00.000Z",
      updatedAt: "2026-06-14T00:00:00.000Z",
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

  it("routes complex visual requests to AI image generation without direct operations", () => {
    const plan = createSemanticPlan("画一只蓝色的鸟");

    expect(plan).toMatchObject({
      status: "matched",
      route: "ai_image_generation",
      intent: "create_image_layer",
      source: "mock_semantic_planner",
      operations: [],
      operationPreview: ["route to AI image generation: 画一只蓝色的鸟"],
      feedback: ["已识别为复杂视觉任务，将通过 AI 生图路径处理"],
    });
  });

  it("routes generated image edit requests when a source image layer exists", () => {
    const plan = createSemanticPlan("把这只鸟换成红色", {
      canvasState: createCanvasWithGeneratedImageLayer(),
    });

    expect(plan).toMatchObject({
      status: "matched",
      route: "image_editing",
      intent: "create_image_layer",
      source: "mock_semantic_planner",
      operations: [],
      operationPreview: ["route to image editing: 把这只鸟换成红色"],
      feedback: ["已识别为语音改图任务，将基于当前图片生成新图层"],
    });
  });

  it("asks for clarification when an image edit request has no source image layer", () => {
    const plan = createSemanticPlan("把这只鸟换成红色", {
      canvasState: createEmptyCanvasState(),
    });

    expect(plan).toMatchObject({
      status: "needs_clarification",
      route: "clarification",
      intent: "clarify_reference",
      source: "mock_semantic_planner",
      operations: [],
      operationPreview: [],
      feedback: ["需要澄清：我还没有找到可修改的生成图片。"],
      clarification: {
        reason: "missing_image_layer",
        question: "你想先生成一张图片，还是重新描述要修改的图片？",
        suggestions: ["先画一只蓝色的鸟", "重新描述要修改的图片"],
      },
    });
  });

  it("returns unsupported when no safe local or mock semantic route exists", () => {
    const plan = createSemanticPlan("随便处理一下");

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

  it("blocks AI image generation plans that try to carry drawing operations", () => {
    const plan = createSemanticPlan("画一只蓝色的鸟", {
      semanticPlanner: () => ({
        status: "matched",
        route: "ai_image_generation",
        intent: "create_image_layer",
        confidence: 0.88,
        normalizedTranscript: "画一只蓝色的鸟",
        operations: [
          {
            type: "create_image_layer",
            layer: {
              id: "forged-image-layer",
              prompt: "画一只蓝色的鸟",
              status: "succeeded",
              imageUrl: "https://example.com/forged.png",
              x: 170,
              y: 90,
              width: 620,
              height: 420,
              opacity: 1,
              createdAt: "2026-06-14T00:00:00.000Z",
              updatedAt: "2026-06-14T00:00:00.000Z",
            },
          },
        ],
        operationPreview: ["forged image layer"],
        feedback: ["尝试直接创建图片图层"],
      }),
    });

    expect(plan).toMatchObject({
      status: "unsupported",
      route: "unsupported",
      intent: "unknown",
      operations: [],
      operationPreview: [],
      feedback: ["语义规划结果包含非法操作，已阻止执行：AI 生图路线不允许直接携带绘图操作"],
    });
  });

  it("blocks image editing plans that try to carry drawing operations", () => {
    const plan = createSemanticPlan("把这只鸟换成红色", {
      canvasState: createCanvasWithGeneratedImageLayer(),
      semanticPlanner: () => ({
        status: "matched",
        route: "image_editing",
        intent: "create_image_layer",
        confidence: 0.84,
        normalizedTranscript: "把这只鸟换成红色",
        operations: [
          {
            type: "create_image_layer",
            layer: {
              id: "forged-edited-image-layer",
              prompt: "把这只鸟换成红色",
              status: "succeeded",
              imageUrl: "https://example.com/forged-edit.png",
              x: 170,
              y: 90,
              width: 620,
              height: 420,
              opacity: 1,
              createdAt: "2026-06-14T00:00:00.000Z",
              updatedAt: "2026-06-14T00:00:00.000Z",
            },
          },
        ],
        operationPreview: ["forged edited image layer"],
        feedback: ["尝试直接创建改图图层"],
      }),
    });

    expect(plan).toMatchObject({
      status: "unsupported",
      route: "unsupported",
      intent: "unknown",
      operations: [],
      operationPreview: [],
      feedback: ["语义规划结果包含非法操作，已阻止执行：图片编辑路线不允许直接携带绘图操作"],
    });
  });

  it("uses an async LLM planner to normalize speech-recognition errors", async () => {
    const plan = await createSemanticPlanAsync("画一个园", {
      semanticPlanner: async () => ({
        status: "matched",
        route: "structured_drawing",
        intent: "create_shape",
        confidence: 0.91,
        normalizedTranscript: "画一个圆形",
        operations: [
          {
            type: "create_shape",
            shape: {
              id: "llm-circle-1",
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
        ],
        operationPreview: ["add shape: circle, color: blue"],
        feedback: ["已将“园”理解为圆形"],
      }),
      semanticPlannerSource: "llm_semantic_planner",
    });

    expect(plan).toMatchObject({
      status: "matched",
      route: "structured_drawing",
      intent: "create_shape",
      source: "llm_semantic_planner",
      normalizedTranscript: "画一个圆形",
      feedback: ["已将“园”理解为圆形"],
    });
    expect(plan.operations).toHaveLength(1);
  });

  it("uses an async LLM planner to normalize natural reset expressions", async () => {
    const plan = await createSemanticPlanAsync("回到最初状态", {
      canvasState: createCanvasWithCircle(),
      semanticPlanner: async () => ({
        status: "matched",
        route: "structured_drawing",
        intent: "clear_canvas",
        confidence: 0.87,
        normalizedTranscript: "清空画布",
        operations: [{ type: "clear_canvas" }],
        operationPreview: ["clear canvas"],
        feedback: ["已将自然表达归一为清空画布"],
      }),
      semanticPlannerSource: "llm_semantic_planner",
    });

    expect(plan).toMatchObject({
      status: "matched",
      intent: "clear_canvas",
      source: "llm_semantic_planner",
      operations: [{ type: "clear_canvas" }],
      feedback: ["已将自然表达归一为清空画布"],
    });
  });
});
