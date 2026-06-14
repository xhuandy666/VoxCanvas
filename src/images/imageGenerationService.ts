import type {
  CanvasState,
  DrawingOperation,
  GeneratedImageLayer,
} from "../drawing/drawingState";

export type ImageGenerationRequest = {
  canvasState: CanvasState;
  layerId: string;
  now: string;
  prompt: string;
};

export type ImageGenerationResult = {
  feedback: string[];
  operationPreview: string[];
  operations: DrawingOperation[];
};

export type ImageGenerationService = {
  queueTextToImage: (request: ImageGenerationRequest) => ImageGenerationResult;
};

export function createMockImageGenerationService(): ImageGenerationService {
  return {
    queueTextToImage: ({ layerId, now, prompt }) => {
      const layer: GeneratedImageLayer = {
        id: layerId,
        prompt,
        status: "pending",
        x: 170,
        y: 90,
        width: 620,
        height: 420,
        opacity: 1,
        model: "mock-image-generation",
        createdAt: now,
        updatedAt: now,
      };

      return {
        operations: [
          {
            type: "create_image_layer",
            layer,
          },
        ],
        operationPreview: [`queue image generation: ${prompt}`],
        feedback: ["已进入 AI 生图队列，等待生成服务返回结果"],
      };
    },
  };
}
