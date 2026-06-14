import type {
  CanvasState,
  DrawingOperation,
  GeneratedImageLayer,
} from "../drawing/drawingState";
import { DEFAULT_IMAGE_LAYER_PLACEMENT } from "../canvas/canvasWorkspace";

export type ImageGenerationRequest = {
  canvasState: CanvasState;
  layerId: string;
  now: string;
  prompt: string;
};

export type ImageEditingRequest = {
  canvasState: CanvasState;
  editInstruction: string;
  layerId: string;
  now: string;
  sourceLayer: GeneratedImageLayer;
};

export type ImageGenerationResult = {
  feedback: string[];
  operationPreview: string[];
  operations: DrawingOperation[];
};

export type ImageGenerationService = {
  queueImageEdit: (request: ImageEditingRequest) => ImageGenerationResult;
  queueTextToImage: (request: ImageGenerationRequest) => ImageGenerationResult;
};

export function createMockImageGenerationService(): ImageGenerationService {
  return {
    queueImageEdit: ({ editInstruction, layerId, now, sourceLayer }) => {
      const layer: GeneratedImageLayer = {
        id: layerId,
        prompt: `${sourceLayer.prompt}\n修改指令：${editInstruction}`,
        status: "pending",
        x: sourceLayer.x,
        y: sourceLayer.y,
        width: sourceLayer.width,
        height: sourceLayer.height,
        opacity: sourceLayer.opacity,
        model: "mock-image-editing",
        revisedPrompt: editInstruction,
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
        operationPreview: [`queue image edit: ${sourceLayer.id} -> ${layerId}`],
        feedback: ["已进入 AI 改图队列，基于上一张图片生成新图层"],
      };
    },
    queueTextToImage: ({ layerId, now, prompt }) => {
      const layer: GeneratedImageLayer = {
        id: layerId,
        prompt,
        status: "pending",
        ...DEFAULT_IMAGE_LAYER_PLACEMENT,
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
