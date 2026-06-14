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
  queuedImageRequest?: QueuedImageGenerationRequest;
  operationPreview: string[];
  operations: DrawingOperation[];
};

export type QueuedImageGenerationRequest = {
  editInstruction?: string;
  layer: GeneratedImageLayer;
  mode: "image_editing" | "text_to_image";
  sourceLayer?: GeneratedImageLayer;
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
  const imageRoutingResult =
    plan.route === "image_editing"
      ? createImageEditingResult({
          canvasState,
          editInstruction: prompt,
          imageGenerationService,
          layerId,
          now: timestamp,
        })
      : {
          imageResult: imageGenerationService.queueTextToImage({
            canvasState,
            layerId,
            now: timestamp,
            prompt,
          }),
          mode: "text_to_image" as const,
          sourceLayer: undefined,
        };

  if (!imageRoutingResult) {
    return {
      feedback: ["语音改图需要先有一张可修改的生成图片"],
      operationPreview: [],
      operations: [],
    };
  }

  const validation = validateDrawingOperations(
    imageRoutingResult.imageResult.operations,
    canvasState,
  );

  if (!validation.valid) {
    const reasons = [...new Set(validation.errors.map((error) => error.reason))];

    return {
      feedback: [`AI 生图操作未通过校验，已阻止执行：${reasons.join("；")}`],
      operationPreview: [],
      operations: [],
    };
  }

  return {
    feedback: [...plan.feedback, ...imageRoutingResult.imageResult.feedback],
    queuedImageRequest: createQueuedImageRequest({
      editInstruction: plan.route === "image_editing" ? prompt : undefined,
      mode: imageRoutingResult.mode,
      operations: validation.operations,
      sourceLayer: imageRoutingResult.sourceLayer,
    }),
    operationPreview: imageRoutingResult.imageResult.operationPreview,
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

  return {
    imageResult: imageGenerationService.queueImageEdit({
      canvasState,
      editInstruction,
      layerId,
      now,
      sourceLayer,
    }),
    mode: "image_editing" as const,
    sourceLayer,
  };
}

function findEditableImageLayer(canvasState: CanvasState): GeneratedImageLayer | null {
  return (
    findImageLayerById(canvasState, canvasState.selectedImageLayerId) ??
    findImageLayerById(canvasState, canvasState.lastImageLayerId) ??
    findLastEditableImageLayer(canvasState.imageLayers) ??
    null
  );
}

function findImageLayerById(canvasState: CanvasState, layerId: string | null) {
  if (!layerId) {
    return null;
  }

  const layer = canvasState.imageLayers.find((item) => item.id === layerId) ?? null;

  return layer && isLayerReadyForEditing(layer) ? layer : null;
}

function findLastEditableImageLayer(layers: GeneratedImageLayer[]) {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    if (isLayerReadyForEditing(layers[index])) {
      return layers[index];
    }
  }

  return null;
}

function isLayerReadyForEditing(layer: GeneratedImageLayer) {
  return layer.status === "succeeded" && Boolean(layer.imageUrl);
}

function createQueuedImageRequest({
  editInstruction,
  mode,
  operations,
  sourceLayer,
}: {
  editInstruction?: string;
  mode: QueuedImageGenerationRequest["mode"];
  operations: DrawingOperation[];
  sourceLayer?: GeneratedImageLayer;
}) {
  const layerOperation = operations.find(
    (operation) => operation.type === "create_image_layer",
  );

  if (!layerOperation || layerOperation.type !== "create_image_layer") {
    return undefined;
  }

  return {
    editInstruction,
    layer: layerOperation.layer,
    mode,
    sourceLayer,
  };
}
