import type { CanvasState, DrawingOperation } from "../drawing/drawingState";
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
  if (plan.status !== "matched" || plan.route !== "ai_image_generation") {
    return {
      feedback: plan.feedback,
      operationPreview: plan.operationPreview,
      operations: plan.operations,
    };
  }

  const prompt = plan.normalizedTranscript.trim();
  const imageResult = imageGenerationService.queueTextToImage({
    canvasState,
    layerId: createImageLayerId(prompt),
    now: now(),
    prompt,
  });
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
