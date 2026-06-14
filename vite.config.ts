import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { loadEnv, type PluginOption } from "vite";
import {
  createOpenAIResponsesRequestBody,
  extractSemanticPlanFromOpenAIResponse,
  OPENAI_SEMANTIC_PLANNER_MODEL,
} from "./src/planning/openAIResponsesPlanner";
import {
  createOpenAICompatibleChatRequestBody,
  DASHSCOPE_SEMANTIC_PLANNER_MODEL,
  extractSemanticPlanFromOpenAICompatibleChatResponse,
} from "./src/planning/openAICompatibleChatPlanner";
import type { CanvasState, GeneratedImageLayer } from "./src/drawing/drawingState";
import type { RawSemanticPlanResult } from "./src/planning/semanticPlanner";
import {
  createDashScopeImageGenerationRequestBody,
  DASHSCOPE_IMAGE_GENERATION_ENDPOINT,
  DASHSCOPE_IMAGE_GENERATION_MODEL,
  extractDashScopeImageGenerationResult,
  sanitizeImageProviderErrorMessage,
  type DashScopeImageGenerationResult,
} from "./src/images/dashScopeImageGeneration";

const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const DASHSCOPE_COMPATIBLE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

type SemanticPlanProvider = "openai" | "dashscope";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, getProcessCwd(), "");

  return {
    plugins: [react(), createVoxCanvasApiPlugin(env)],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
    },
  };
});

type SemanticPlanApiPayload = {
  canvasState?: CanvasState;
  normalizedTranscript?: string;
  parserStatus?: string;
  transcript?: string;
};

type ImageGenerationApiPayload = {
  canvasState?: CanvasState;
  editInstruction?: string;
  layer?: GeneratedImageLayer;
  mode?: string;
  sourceLayer?: GeneratedImageLayer;
};

type DevServerRequest = AsyncIterable<Uint8Array | string> & {
  method?: string;
};

type DevServerResponse = {
  end: (body: string) => void;
  setHeader: (name: string, value: string) => void;
  statusCode: number;
};

type RuntimeFetch = (
  input: string,
  init: {
    body: string;
    headers: Record<string, string>;
    method: "POST";
  },
) => Promise<{
  json: () => Promise<unknown>;
  ok: boolean;
  status?: number;
  text?: () => Promise<string>;
}>;

type RuntimeProcess = {
  cwd: () => string;
};

function createVoxCanvasApiPlugin(env: Record<string, string>): PluginOption {
  return {
    name: "voxcanvas-local-api",
    configureServer(server) {
      server.middlewares.use("/api/semantic-plan", async (request, response) => {
        const apiRequest = request as DevServerRequest;
        const apiResponse = response as DevServerResponse;

        if (apiRequest.method !== "POST") {
          sendJson(apiResponse, 405, {
            error: "method_not_allowed",
          });
          return;
        }

        const payload = await readSemanticPlanPayload(apiRequest);
        const transcript = payload.transcript ?? payload.normalizedTranscript ?? "";
        const canvasState = payload.canvasState ?? createEmptyCanvasStateForApi();

        const provider = getSemanticPlanProvider(env);
        const apiKey = getProviderApiKey(provider, env);

        if (!apiKey) {
          sendJson(
            apiResponse,
            200,
            createUnavailableSemanticPlan(
              transcript,
              `未检测到 ${getProviderApiKeyName(
                provider,
              )}。请确认 .env 已配置，并重启 dev server`,
            ),
          );
          return;
        }

        try {
          const fetchImpl = getRuntimeFetch();

          if (!fetchImpl) {
            sendJson(
              apiResponse,
              502,
              createUnavailableSemanticPlan(transcript, "当前 Node 运行环境不支持 fetch"),
            );
            return;
          }

          const providerResponse = await requestSemanticPlanFromProvider({
            apiKey,
            canvasState,
            env,
            fetchImpl,
            provider,
            transcript,
          });

          if (!providerResponse.ok) {
            const errorMessage = await readProviderErrorMessage(providerResponse);

            sendJson(
              apiResponse,
              502,
              createUnavailableSemanticPlan(
                transcript,
                `${getProviderDisplayName(provider)} 返回 HTTP ${
                  providerResponse.status ?? "错误"
                }${
                  errorMessage ? `：${errorMessage}` : ""
                }`,
              ),
            );
            return;
          }

          sendJson(
            apiResponse,
            200,
            normalizeProviderSemanticPlan(
              extractSemanticPlanFromProviderResponse(
                provider,
                await providerResponse.json(),
              ),
              transcript,
            ),
          );
        } catch (error) {
          sendJson(
            apiResponse,
            502,
            createUnavailableSemanticPlan(
              transcript,
              `本地代理请求失败：${getSafeErrorMessage(error)}`,
            ),
          );
        }
      });

      server.middlewares.use("/api/image-generation", async (request, response) => {
        const apiRequest = request as DevServerRequest;
        const apiResponse = response as DevServerResponse;

        if (apiRequest.method !== "POST") {
          sendJson(apiResponse, 405, {
            error: "method_not_allowed",
          });
          return;
        }

        const payload = await readImageGenerationPayload(apiRequest);
        const validation = validateImageGenerationPayload(payload);

        if (!validation.valid) {
          sendImageGenerationJson(apiResponse, 400, {
            status: "failed",
            errorMessage: validation.reason,
          });
          return;
        }

        if (!env.DASHSCOPE_API_KEY) {
          sendImageGenerationJson(apiResponse, 200, {
            status: "failed",
            errorMessage:
              "未检测到 DASHSCOPE_API_KEY。请确认 .env 已配置，并重启 dev server",
          });
          return;
        }

        try {
          const fetchImpl = getRuntimeFetch();

          if (!fetchImpl) {
            sendImageGenerationJson(apiResponse, 502, {
              status: "failed",
              errorMessage: "当前 Node 运行环境不支持 fetch",
            });
            return;
          }

          const providerResponse = await requestImageGenerationFromDashScope({
            apiKey: env.DASHSCOPE_API_KEY,
            env,
            fetchImpl,
            payload: validation.payload,
          });

          if (!providerResponse.ok) {
            const errorMessage = await readProviderErrorMessage(providerResponse);

            sendImageGenerationJson(apiResponse, 200, {
              status: "failed",
              errorMessage: `DashScope 图片模型返回 HTTP ${
                providerResponse.status ?? "错误"
              }${errorMessage ? `：${errorMessage}` : ""}`,
            });
            return;
          }

          sendImageGenerationJson(
            apiResponse,
            200,
            extractDashScopeImageGenerationResult(
              await providerResponse.json(),
              getImageGenerationModel(env),
            ),
          );
        } catch (error) {
          sendImageGenerationJson(apiResponse, 200, {
            status: "failed",
            errorMessage: `本地图片代理请求失败：${getSafeErrorMessage(error)}`,
          });
        }
      });
    },
  };
}

type SemanticPlanProviderRequest = {
  apiKey: string;
  canvasState: CanvasState;
  env: Record<string, string>;
  fetchImpl: RuntimeFetch;
  provider: SemanticPlanProvider;
  transcript: string;
};

export function getSemanticPlanProvider(
  env: Record<string, string>,
): SemanticPlanProvider {
  return env.VOXCANVAS_LLM_PROVIDER?.toLowerCase() === "dashscope"
    ? "dashscope"
    : "openai";
}

export function getProviderApiKey(
  provider: SemanticPlanProvider,
  env: Record<string, string>,
) {
  return provider === "dashscope" ? env.DASHSCOPE_API_KEY : env.OPENAI_API_KEY;
}

export function getProviderApiKeyName(provider: SemanticPlanProvider) {
  return provider === "dashscope" ? "DASHSCOPE_API_KEY" : "OPENAI_API_KEY";
}

export function getProviderDisplayName(provider: SemanticPlanProvider) {
  return provider === "dashscope"
    ? "DashScope OpenAI 兼容接口"
    : "OpenAI Responses API";
}

export function getProviderModel(
  provider: SemanticPlanProvider,
  env: Record<string, string>,
) {
  if (env.VOXCANVAS_LLM_MODEL) {
    return env.VOXCANVAS_LLM_MODEL;
  }

  return provider === "dashscope"
    ? DASHSCOPE_SEMANTIC_PLANNER_MODEL
    : OPENAI_SEMANTIC_PLANNER_MODEL;
}

export function getDashScopeChatCompletionsEndpoint(env: Record<string, string>) {
  const baseUrl =
    env.VOXCANVAS_DASHSCOPE_BASE_URL ||
    env.VOXCANVAS_LLM_BASE_URL ||
    DASHSCOPE_COMPATIBLE_BASE_URL;

  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function requestSemanticPlanFromProvider({
  apiKey,
  canvasState,
  env,
  fetchImpl,
  provider,
  transcript,
}: SemanticPlanProviderRequest) {
  if (provider === "dashscope") {
    return fetchImpl(getDashScopeChatCompletionsEndpoint(env), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        createOpenAICompatibleChatRequestBody({
          canvasState,
          model: getProviderModel(provider, env),
          transcript,
        }),
      ),
    });
  }

  return fetchImpl(OPENAI_RESPONSES_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      createOpenAIResponsesRequestBody({
        canvasState,
        model: getProviderModel(provider, env),
        transcript,
      }),
    ),
  });
}

type ValidImageGenerationPayload = {
  editInstruction?: string;
  layer: GeneratedImageLayer;
  mode: "image_editing" | "text_to_image";
  sourceLayer?: GeneratedImageLayer;
};

type ImageGenerationProviderRequest = {
  apiKey: string;
  env: Record<string, string>;
  fetchImpl: RuntimeFetch;
  payload: ValidImageGenerationPayload;
};

function requestImageGenerationFromDashScope({
  apiKey,
  env,
  fetchImpl,
  payload,
}: ImageGenerationProviderRequest) {
  return fetchImpl(getDashScopeImageGenerationEndpoint(env), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      createDashScopeImageGenerationRequestBody({
        imageUrl: payload.sourceLayer?.imageUrl,
        instruction: payload.editInstruction,
        mode: payload.mode,
        model: getImageGenerationModel(env),
        prompt: payload.layer.prompt,
        size: env.VOXCANVAS_IMAGE_SIZE || "2K",
        watermark: env.VOXCANVAS_IMAGE_WATERMARK === "true",
      }),
    ),
  });
}

export function getDashScopeImageGenerationEndpoint(env: Record<string, string>) {
  return (
    env.VOXCANVAS_IMAGE_ENDPOINT ||
    env.VOXCANVAS_DASHSCOPE_IMAGE_ENDPOINT ||
    DASHSCOPE_IMAGE_GENERATION_ENDPOINT
  );
}

export function getImageGenerationModel(env: Record<string, string>) {
  return env.VOXCANVAS_IMAGE_MODEL || DASHSCOPE_IMAGE_GENERATION_MODEL;
}

function extractSemanticPlanFromProviderResponse(
  provider: SemanticPlanProvider,
  response: unknown,
) {
  return provider === "dashscope"
    ? extractSemanticPlanFromOpenAICompatibleChatResponse(response)
    : extractSemanticPlanFromOpenAIResponse(response);
}

async function readSemanticPlanPayload(
  request: DevServerRequest,
): Promise<SemanticPlanApiPayload> {
  let body = "";

  for await (const chunk of request) {
    body += decodeRequestChunk(chunk);
  }

  if (!body.trim()) {
    return {};
  }

  const payload = JSON.parse(body) as unknown;

  if (!isRecord(payload)) {
    return {};
  }

  return payload as SemanticPlanApiPayload;
}

async function readImageGenerationPayload(
  request: DevServerRequest,
): Promise<ImageGenerationApiPayload> {
  let body = "";

  for await (const chunk of request) {
    body += decodeRequestChunk(chunk);
  }

  if (!body.trim()) {
    return {};
  }

  const payload = JSON.parse(body) as unknown;

  if (!isRecord(payload)) {
    return {};
  }

  return payload as ImageGenerationApiPayload;
}

function sendJson(
  response: DevServerResponse,
  statusCode: number,
  payload: RawSemanticPlanResult | { error: string },
) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function sendImageGenerationJson(
  response: DevServerResponse,
  statusCode: number,
  payload: DashScopeImageGenerationResult | { error: string },
) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function createUnavailableSemanticPlan(
  transcript: string,
  reason?: string,
): RawSemanticPlanResult {
  const feedback = reason
    ? [`LLM 语义规划暂不可用：${reason}，已保留安全失败状态`]
    : ["LLM 语义规划暂不可用，已保留安全失败状态"];

  return {
    status: "unsupported",
    route: "unsupported",
    intent: "unknown",
    confidence: 0,
    normalizedTranscript: transcript,
    operations: [],
    operationPreview: [],
    feedback,
  };
}

function createEmptyCanvasStateForApi(): CanvasState {
  return {
    imageLayers: [],
    shapes: [],
    selectedImageLayerId: null,
    selectedShapeId: null,
    lastImageLayerId: null,
    lastShapeId: null,
    version: 0,
  };
}

function validateImageGenerationPayload(
  payload: ImageGenerationApiPayload,
):
  | {
      valid: true;
      payload: ValidImageGenerationPayload;
    }
  | {
      valid: false;
      reason: string;
    } {
  if (!isGeneratedImageLayerForApi(payload.layer)) {
    return {
      valid: false,
      reason: "图片生成请求缺少合法目标图层",
    };
  }

  if (payload.mode !== "image_editing" && payload.mode !== "text_to_image") {
    return {
      valid: false,
      reason: "图片生成请求 mode 不合法",
    };
  }

  if (payload.mode === "image_editing") {
    if (!isGeneratedImageLayerForApi(payload.sourceLayer)) {
      return {
        valid: false,
        reason: "图片编辑请求缺少合法旧图图层",
      };
    }

    if (
      payload.sourceLayer.status !== "succeeded" ||
      !isNonEmptyString(payload.sourceLayer.imageUrl)
    ) {
      return {
        valid: false,
        reason: "图片编辑需要先等待旧图生成成功",
      };
    }
  }

  return {
    valid: true,
    payload: {
      editInstruction:
        typeof payload.editInstruction === "string"
          ? payload.editInstruction
          : undefined,
      layer: payload.layer,
      mode: payload.mode,
      sourceLayer: payload.sourceLayer,
    },
  };
}

export function normalizeProviderSemanticPlan(
  rawPlan: unknown,
  fallbackTranscript: string,
): RawSemanticPlanResult {
  if (!isRecord(rawPlan)) {
    return createUnavailableSemanticPlan(
      fallbackTranscript,
      "provider 返回了无法识别的语义规划结果",
    );
  }

  const status = normalizePlanStatus(rawPlan.status);
  const route = normalizePlanRoute(rawPlan.route, status);
  const operations = Array.isArray(rawPlan.operations) ? rawPlan.operations : [];
  const operationPreview = Array.isArray(rawPlan.operationPreview)
    ? rawPlan.operationPreview.filter((item): item is string => typeof item === "string")
    : [];
  const feedback = Array.isArray(rawPlan.feedback)
    ? rawPlan.feedback.filter((item): item is string => typeof item === "string")
    : [];

  const normalizedTranscript =
    typeof rawPlan.normalizedTranscript === "string"
      ? rawPlan.normalizedTranscript
      : fallbackTranscript;

  return {
    status,
    route,
    intent: normalizePlanIntent(rawPlan.intent, route),
    confidence:
      typeof rawPlan.confidence === "number" &&
      Number.isFinite(rawPlan.confidence)
        ? Math.max(0, Math.min(rawPlan.confidence, 1))
        : status === "matched"
          ? 0.7
          : 0,
    normalizedTranscript,
    operations,
    operationPreview,
    feedback:
      feedback.length > 0
        ? feedback
        : [createDefaultProviderFeedback(status, route, normalizedTranscript)],
    clarification: normalizeClarification(rawPlan.clarification),
  };
}

function normalizePlanStatus(value: unknown) {
  if (
    value === "matched" ||
    value === "unsupported" ||
    value === "needs_clarification"
  ) {
    return value;
  }

  return "unsupported";
}

function normalizePlanRoute(
  value: unknown,
  status: RawSemanticPlanResult["status"],
): RawSemanticPlanResult["route"] {
  if (
    value === "structured_drawing" ||
    value === "clarification" ||
    value === "unsupported" ||
    value === "ai_image_generation" ||
    value === "image_editing"
  ) {
    return value;
  }

  return status === "needs_clarification" ? "clarification" : "unsupported";
}

function normalizePlanIntent(
  value: unknown,
  route: RawSemanticPlanResult["route"],
): RawSemanticPlanResult["intent"] {
  if (typeof value === "string") {
    return value as RawSemanticPlanResult["intent"];
  }

  if (route === "clarification") {
    return "clarify_command";
  }

  return "unknown";
}

function normalizeClarification(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const reason = typeof value.reason === "string" ? value.reason : "needs_clarification";
  const question =
    typeof value.question === "string"
      ? value.question
      : "我需要更多信息才能安全执行这条指令。";
  const suggestions = Array.isArray(value.suggestions)
    ? value.suggestions.filter((item): item is string => typeof item === "string")
    : [];

  return {
    reason,
    question,
    suggestions,
  };
}

function createDefaultProviderFeedback(
  status: RawSemanticPlanResult["status"],
  route: RawSemanticPlanResult["route"],
  normalizedTranscript: string,
) {
  if (status === "needs_clarification" || route === "clarification") {
    return "需要澄清：这条语音指令还不足以安全执行";
  }

  if (status === "matched") {
    return `已通过 LLM 语义规划理解为：${normalizedTranscript}`;
  }

  return "LLM 暂未给出可安全执行的结构化计划";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeRequestChunk(chunk: Uint8Array | string) {
  if (typeof chunk === "string") {
    return chunk;
  }

  const TextDecoderConstructor = (
    globalThis as unknown as {
      TextDecoder?: new () => {
        decode: (input: Uint8Array) => string;
      };
    }
  ).TextDecoder;

  if (TextDecoderConstructor) {
    return new TextDecoderConstructor().decode(chunk);
  }

  return Array.from(chunk, (byte) => String.fromCharCode(byte)).join("");
}

function getRuntimeFetch(): RuntimeFetch | undefined {
  return (globalThis as unknown as { fetch?: RuntimeFetch }).fetch;
}

async function readProviderErrorMessage(response: Awaited<ReturnType<RuntimeFetch>>) {
  if (typeof response.text === "function") {
    const text = await response.text();

    return extractProviderErrorMessage(text);
  }

  try {
    return extractProviderErrorMessage(JSON.stringify(await response.json()));
  } catch {
    return "";
  }
}

function extractProviderErrorMessage(rawBody: string) {
  if (!rawBody.trim()) {
    return "";
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;

    if (isRecord(payload) && isRecord(payload.error)) {
      if (typeof payload.error.message === "string") {
        return sanitizeProviderErrorMessage(payload.error.message).slice(0, 240);
      }

      if (typeof payload.error.code === "string") {
        return sanitizeProviderErrorMessage(payload.error.code).slice(0, 240);
      }
    }
  } catch {
    return sanitizeProviderErrorMessage(rawBody).slice(0, 240);
  }

  return sanitizeProviderErrorMessage(rawBody).slice(0, 240);
}

export function sanitizeProviderErrorMessage(message: string) {
  return sanitizeImageProviderErrorMessage(message);
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 160);
  }

  return "unknown_error";
}

function getProcessCwd() {
  return (globalThis as unknown as { process: RuntimeProcess }).process.cwd();
}

function isGeneratedImageLayerForApi(value: unknown): value is GeneratedImageLayer {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.prompt) &&
    (value.status === "pending" ||
      value.status === "succeeded" ||
      value.status === "failed") &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height) &&
    isFiniteNumber(value.opacity) &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.updatedAt) &&
    (value.imageUrl === undefined || isNonEmptyString(value.imageUrl)) &&
    (value.model === undefined || isNonEmptyString(value.model)) &&
    (value.revisedPrompt === undefined || typeof value.revisedPrompt === "string") &&
    (value.errorMessage === undefined || typeof value.errorMessage === "string")
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
