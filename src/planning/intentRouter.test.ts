import { describe, expect, it } from "vitest";
import {
  applyDrawingOperation,
  createEmptyCanvasState,
  type CanvasState,
} from "../drawing/drawingState";
import { routeSemanticPlan } from "./intentRouter";
import type { SemanticPlanResult } from "./semanticPlanner";

const imageGenerationPlan: SemanticPlanResult = {
  status: "matched",
  route: "ai_image_generation",
  intent: "create_image_layer",
  source: "mock_semantic_planner",
  confidence: 0.74,
  normalizedTranscript: "画一只蓝色的鸟",
  operations: [],
  operationPreview: ["route to AI image generation: 画一只蓝色的鸟"],
  feedback: ["已识别为复杂视觉任务，将通过 AI 生图路径处理"],
};

const imageEditingPlan: SemanticPlanResult = {
  status: "matched",
  route: "image_editing",
  intent: "create_image_layer",
  source: "mock_semantic_planner",
  confidence: 0.76,
  normalizedTranscript: "把这只鸟换成红色",
  operations: [],
  operationPreview: ["route to image editing: 把这只鸟换成红色"],
  feedback: ["已识别为语音改图任务，将基于当前图片生成新图层"],
};

function createCanvasWithImageLayer(): CanvasState {
  return applyDrawingOperation(createEmptyCanvasState(), {
    type: "create_image_layer",
    layer: {
      id: "image-layer-bird-1",
      prompt: "画一只蓝色的鸟",
      status: "succeeded",
      x: 170,
      y: 90,
      width: 620,
      height: 420,
      opacity: 1,
      imageUrl: "https://example.com/blue-bird.png",
      model: "mock-image-generation",
      createdAt: "2026-06-14T00:00:00.000Z",
      updatedAt: "2026-06-14T00:00:00.000Z",
    },
  });
}

describe("routeSemanticPlan", () => {
  it("queues AI image generation as a managed pending image layer", () => {
    const result = routeSemanticPlan(imageGenerationPlan, {
      canvasState: createEmptyCanvasState(),
      createImageLayerId: () => "image-layer-bird-1",
      now: () => "2026-06-14T00:00:00.000Z",
    });

    expect(result.operationPreview).toEqual([
      "queue image generation: 画一只蓝色的鸟",
    ]);
    expect(result.feedback).toEqual([
      "已识别为复杂视觉任务，将通过 AI 生图路径处理",
      "已进入 AI 生图队列，等待生成服务返回结果",
    ]);
    expect(result.operations).toEqual([
      {
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
      },
    ]);
  });

  it("passes through non-image routes without generating image operations", () => {
    const result = routeSemanticPlan(
      {
        status: "matched",
        route: "structured_drawing",
        intent: "clear_canvas",
        source: "rule_parser",
        confidence: 1,
        normalizedTranscript: "清空画布",
        operations: [{ type: "clear_canvas" }],
        operationPreview: ["clear canvas"],
        feedback: ["已解析为清空画布操作"],
      },
      {
        canvasState: createEmptyCanvasState(),
      },
    );

    expect(result.operations).toEqual([{ type: "clear_canvas" }]);
    expect(result.operationPreview).toEqual(["clear canvas"]);
    expect(result.feedback).toEqual(["已解析为清空画布操作"]);
  });

  it("queues voice image editing as a new managed pending image layer", () => {
    const result = routeSemanticPlan(imageEditingPlan, {
      canvasState: createCanvasWithImageLayer(),
      createImageLayerId: () => "image-layer-bird-edit-1",
      now: () => "2026-06-14T00:02:00.000Z",
    });

    expect(result.operationPreview).toEqual([
      "queue image edit: image-layer-bird-1 -> image-layer-bird-edit-1",
    ]);
    expect(result.feedback).toEqual([
      "已识别为语音改图任务，将基于当前图片生成新图层",
      "已进入 AI 改图队列，基于上一张图片生成新图层",
    ]);
    expect(result.operations).toEqual([
      {
        type: "create_image_layer",
        layer: {
          id: "image-layer-bird-edit-1",
          prompt: "画一只蓝色的鸟\n修改指令：把这只鸟换成红色",
          status: "pending",
          x: 170,
          y: 90,
          width: 620,
          height: 420,
          opacity: 1,
          model: "mock-image-editing",
          revisedPrompt: "把这只鸟换成红色",
          createdAt: "2026-06-14T00:02:00.000Z",
          updatedAt: "2026-06-14T00:02:00.000Z",
        },
      },
    ]);
  });

  it("blocks voice image editing when no source image layer exists", () => {
    const result = routeSemanticPlan(imageEditingPlan, {
      canvasState: createEmptyCanvasState(),
    });

    expect(result.operations).toEqual([]);
    expect(result.operationPreview).toEqual([]);
    expect(result.feedback).toEqual([
      "语音改图需要先有一张可修改的生成图片",
    ]);
  });

  it("blocks voice image editing while the source image layer is still pending", () => {
    const pendingCanvas = applyDrawingOperation(createEmptyCanvasState(), {
      type: "create_image_layer",
      layer: {
        id: "image-layer-pending",
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
    const result = routeSemanticPlan(imageEditingPlan, {
      canvasState: pendingCanvas,
    });

    expect(result.operations).toEqual([]);
    expect(result.feedback).toEqual([
      "语音改图需要先有一张可修改的生成图片",
    ]);
  });

  it("blocks invalid image generation service operations", () => {
    const result = routeSemanticPlan(imageGenerationPlan, {
      canvasState: createEmptyCanvasState(),
      imageGenerationService: {
        queueImageEdit: () => ({
          feedback: ["unused edit service"],
          operationPreview: ["unused edit operation"],
          operations: [],
        }),
        queueTextToImage: () => ({
          feedback: ["bad service"],
          operationPreview: ["bad operation"],
          operations: [
            {
              type: "create_image_layer",
              layer: {
                id: "bad-layer",
                prompt: "画一只蓝色的鸟",
                status: "succeeded",
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
        }),
      },
    });

    expect(result.operations).toEqual([]);
    expect(result.operationPreview).toEqual([]);
    expect(result.feedback).toEqual([
      "AI 生图操作未通过校验，已阻止执行：成功图片图层必须包含图片 URL",
    ]);
  });
});
