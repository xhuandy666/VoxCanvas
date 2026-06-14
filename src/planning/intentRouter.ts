import type {
  CanvasState,
  DrawingOperation,
  GeneratedImageLayer,
} from "../drawing/drawingState";
import {
  createMockImageGenerationService,
  type ImageGenerationService,
} from "../images/imageGenerationService";
import { validateDrawingOperations } from "./operationValidator";
import type { SemanticPlanResult } from "./semanticPlanner";

export type RoutedIntentResult = {
  feedback: string[];
  operationPreview: string[];
  operations: DrawingOperation[];
};

export type RouteIntentOptions = {
  canvasState: CanvasState;
  createImageLayerId?: (prompt: string) => string;
  imageGenerationService?: ImageGenerationService;
  now?: () => string;
};

export function routeSemanticPlan(
  plan: SemanticPlanResult,
  {
    canvasState,
    createImageLayerId = createDefaultImageLayerId,
    imageGenerationService = createMockImageGenerationService(),
    now = () => new Date().toISOString(),
  }: RouteIntentOptions,
): RoutedIntentResult {
  if (
    plan.status !== "matched" ||
    (plan.route !== "ai_image_generation" && plan.route !== "image_editing")
  ) {
    return {
      feedback: plan.feedback,
      operationPreview: plan.operationPreview,
      operations: plan.operations,
    };
  }

  const prompt = plan.normalizedTranscript.trim();
  const timestamp = now();
  const layerId = createImageLayerId(prompt);
  const imageResult =
    plan.route === "image_editing"
      ? createImageEditingResult({
          canvasState,
          editInstruction: prompt,
          imageGenerationService,
          layerId,
          now: timestamp,
        })
      : imageGenerationService.queueTextToImage({
          canvasState,
          layerId,
          now: timestamp,
          prompt,
        });

  if (!imageResult) {
    return {
      feedback: ["语音改图需要先有一张可修改的生成图片"],
      operationPreview: [],
      operations: [],
    };
  }

  const validation = validateDrawingOperations(imageResult.operations, canvasState);

  if (!validation.valid) {
    const reasons = [...new Set(validation.errors.map((error) => error.reason))];

    return {
      feedback: [`AI 生图操作未通过校验，已阻止执行：${reasons.join("；")}`],
      operationPreview: [],
      operations: [],
    };
  }

  return {
    feedback: [...plan.feedback, ...imageResult.feedback],
    operationPreview: imageResult.operationPreview,
    operations: validation.operations,
  };
}

function createDefaultImageLayerId(prompt: string) {
  const slug = prompt
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return `image-layer-${slug || "prompt"}`;
}

function createImageEditingResult({
  canvasState,
  editInstruction,
  imageGenerationService,
  layerId,
  now,
}: {
  canvasState: CanvasState;
  editInstruction: string;
  imageGenerationService: ImageGenerationService;
  layerId: string;
  now: string;
}) {
  const sourceLayer = findEditableImageLayer(canvasState);

  if (!sourceLayer) {
    return null;
  }

  return imageGenerationService.queueImageEdit({
    canvasState,
    editInstruction,
    layerId,
    now,
    sourceLayer,
  });
}

function findEditableImageLayer(canvasState: CanvasState): GeneratedImageLayer | null {
  return (
    findImageLayerById(canvasState, canvasState.selectedImageLayerId) ??
    findImageLayerById(canvasState, canvasState.lastImageLayerId) ??
    canvasState.imageLayers[canvasState.imageLayers.length - 1] ??
    null
  );
}

function findImageLayerById(canvasState: CanvasState, layerId: string | null) {
  if (!layerId) {
    return null;
  }

  return canvasState.imageLayers.find((layer) => layer.id === layerId) ?? null;
}
