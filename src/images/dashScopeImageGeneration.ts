import type { GeneratedImageLayer } from "../drawing/drawingState";

export const DASHSCOPE_IMAGE_GENERATION_ENDPOINT =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
export const DASHSCOPE_IMAGE_GENERATION_MODEL = "wan2.7-image-pro";

export type DashScopeImageGenerationMode = "image_editing" | "text_to_image";

export type DashScopeImageGenerationRequestOptions = {
  imageUrl?: string;
  instruction?: string;
  mode: DashScopeImageGenerationMode;
  model?: string;
  prompt: string;
  size?: string;
  watermark?: boolean;
};

export type DashScopeImageGenerationSuccess = {
  imageUrl: string;
  model: string;
  revisedPrompt?: string;
};

export type DashScopeImageGenerationFailure = {
  errorMessage: string;
};

export type DashScopeImageGenerationResult =
  | ({ status: "succeeded" } & DashScopeImageGenerationSuccess)
  | ({ status: "failed" } & DashScopeImageGenerationFailure);

export function createDashScopeImageGenerationRequestBody({
  imageUrl,
  instruction,
  mode,
  model = DASHSCOPE_IMAGE_GENERATION_MODEL,
  prompt,
  size = "2K",
  watermark = false,
}: DashScopeImageGenerationRequestOptions) {
  const text = mode === "image_editing" ? instruction || prompt : prompt;
  const content =
    mode === "image_editing" && imageUrl
      ? [{ image: imageUrl }, { text }]
      : [{ text }];

  return {
    model,
    input: {
      messages: [
        {
          role: "user",
          content,
        },
      ],
    },
    parameters: {
      size,
      n: 1,
      watermark,
      ...(mode === "text_to_image" ? { thinking_mode: true } : {}),
    },
  };
}

export function extractDashScopeImageGenerationResult(
  response: unknown,
  fallbackModel = DASHSCOPE_IMAGE_GENERATION_MODEL,
): DashScopeImageGenerationResult {
  if (!isRecord(response)) {
    return {
      status: "failed",
      errorMessage: "DashScope 返回了无法识别的图片结果",
    };
  }

  const imageUrl = extractImageUrl(response);

  if (imageUrl) {
    return {
      status: "succeeded",
      imageUrl,
      model: extractModel(response) ?? fallbackModel,
      revisedPrompt: extractRevisedPrompt(response),
    };
  }

  return {
    status: "failed",
    errorMessage:
      extractProviderMessage(response) || "DashScope 返回结果中没有图片 URL",
  };
}

export function createImageLayerCompletionPatch(
  result: DashScopeImageGenerationResult,
  updatedAt: string,
): GeneratedImageLayerCompletionPatch {
  if (result.status === "succeeded") {
    return {
      status: "succeeded",
      imageUrl: result.imageUrl,
      model: result.model,
      revisedPrompt: result.revisedPrompt,
      errorMessage: undefined,
      updatedAt,
    };
  }

  return {
    status: "failed",
    errorMessage: result.errorMessage,
    updatedAt,
  };
}

export type GeneratedImageLayerCompletionPatch = Partial<
  Omit<GeneratedImageLayer, "createdAt" | "id">
>;

export function sanitizeImageProviderErrorMessage(message: string) {
  return message
    .replace(/sk-[A-Za-z0-9_*.-]{6,}/g, "[redacted_api_key]")
    .replace(/Bearer\s+[A-Za-z0-9_*.-]{8,}/gi, "Bearer [redacted_api_key]")
    .slice(0, 240);
}

function extractImageUrl(response: Record<string, unknown>) {
  const output = response.output;

  if (!isRecord(output)) {
    return null;
  }

  const choices = output.choices;

  if (!Array.isArray(choices)) {
    return null;
  }

  for (const choice of choices) {
    if (!isRecord(choice) || !isRecord(choice.message)) {
      continue;
    }

    const content = choice.message.content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const item of content) {
      if (isRecord(item) && typeof item.image === "string" && item.image.trim()) {
        return item.image;
      }
    }
  }

  return null;
}

function extractModel(response: Record<string, unknown>) {
  return typeof response.model === "string" && response.model.trim()
    ? response.model
    : undefined;
}

function extractRevisedPrompt(response: Record<string, unknown>) {
  const output = response.output;

  if (!isRecord(output)) {
    return undefined;
  }

  return typeof output.text === "string" ? output.text : undefined;
}

function extractProviderMessage(response: Record<string, unknown>) {
  if (typeof response.message === "string" && response.message.trim()) {
    return sanitizeImageProviderErrorMessage(response.message);
  }

  if (typeof response.code === "string" && response.code.trim()) {
    return sanitizeImageProviderErrorMessage(response.code);
  }

  if (isRecord(response.error)) {
    if (typeof response.error.message === "string" && response.error.message.trim()) {
      return sanitizeImageProviderErrorMessage(response.error.message);
    }

    if (typeof response.error.code === "string" && response.error.code.trim()) {
      return sanitizeImageProviderErrorMessage(response.error.code);
    }
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
