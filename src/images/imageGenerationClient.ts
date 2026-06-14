import type { CanvasState, GeneratedImageLayer } from "../drawing/drawingState";

export type RemoteImageGenerationMode = "image_editing" | "text_to_image";

export type RemoteImageGenerationRequest = {
  canvasState: CanvasState;
  editInstruction?: string;
  layer: GeneratedImageLayer;
  mode: RemoteImageGenerationMode;
  sourceLayer?: GeneratedImageLayer;
};

export type RemoteImageGenerationResult = {
  errorMessage?: string;
  imageUrl?: string;
  model?: string;
  revisedPrompt?: string;
  status: "failed" | "succeeded";
};

type FetchResponse = {
  json: () => Promise<unknown>;
  ok: boolean;
  status?: number;
};

type FetchLike = (
  input: string,
  init: {
    body: string;
    headers: Record<string, string>;
    method: "POST";
  },
) => Promise<FetchResponse>;

type RemoteImageGenerationClientOptions = {
  endpoint?: string;
  fetchImpl?: FetchLike;
};

export type RemoteImageGenerationClient = (
  request: RemoteImageGenerationRequest,
) => Promise<RemoteImageGenerationResult>;

export function createRemoteImageGenerationClient({
  endpoint = "/api/image-generation",
  fetchImpl = getDefaultFetch(),
}: RemoteImageGenerationClientOptions = {}): RemoteImageGenerationClient {
  return async (request) => {
    if (!fetchImpl) {
      return {
        status: "failed",
        errorMessage: "当前浏览器环境无法连接图片生成端点",
      };
    }

    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createImageGenerationPayload(request)),
      });
      const payload = await readJsonPayload(response);

      if (isRemoteImageGenerationResult(payload)) {
        return payload;
      }

      return {
        status: "failed",
        errorMessage: getEndpointFailureReason(payload, response.status),
      };
    } catch {
      return {
        status: "failed",
        errorMessage: "无法连接本地图片生成端点",
      };
    }
  };
}

function createImageGenerationPayload(request: RemoteImageGenerationRequest) {
  return {
    canvasState: request.canvasState,
    editInstruction: request.editInstruction,
    layer: request.layer,
    mode: request.mode,
    sourceLayer: request.sourceLayer,
  };
}

async function readJsonPayload(response: FetchResponse) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRemoteImageGenerationResult(
  value: unknown,
): value is RemoteImageGenerationResult {
  return (
    isRecord(value) &&
    (value.status === "failed" || value.status === "succeeded") &&
    (value.errorMessage === undefined || typeof value.errorMessage === "string") &&
    (value.status !== "succeeded" ||
      (typeof value.imageUrl === "string" && value.imageUrl.trim().length > 0)) &&
    (value.imageUrl === undefined || typeof value.imageUrl === "string") &&
    (value.model === undefined || typeof value.model === "string") &&
    (value.revisedPrompt === undefined || typeof value.revisedPrompt === "string")
  );
}

function getEndpointFailureReason(payload: unknown, status?: number) {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }

  return `图片生成端点返回 HTTP ${status ?? "错误"}`;
}

function getDefaultFetch(): FetchLike | undefined {
  if (typeof globalThis.fetch !== "function") {
    return undefined;
  }

  return globalThis.fetch.bind(globalThis) as FetchLike;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
