import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { loadEnv, type PluginOption } from "vite";
import {
  createOpenAIResponsesRequestBody,
  extractSemanticPlanFromOpenAIResponse,
  OPENAI_SEMANTIC_PLANNER_MODEL,
} from "./src/planning/openAIResponsesPlanner";
import type { CanvasState } from "./src/drawing/drawingState";
import type { RawSemanticPlanResult } from "./src/planning/semanticPlanner";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, getProcessCwd(), "");

  return {
    plugins: [react(), createSemanticPlanApiPlugin(env)],
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
}>;

type RuntimeProcess = {
  cwd: () => string;
};

function createSemanticPlanApiPlugin(env: Record<string, string>): PluginOption {
  return {
    name: "voxcanvas-semantic-plan-api",
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

        if (!env.OPENAI_API_KEY) {
          sendJson(apiResponse, 200, createUnavailableSemanticPlan(transcript));
          return;
        }

        try {
          const fetchImpl = getRuntimeFetch();

          if (!fetchImpl) {
            sendJson(apiResponse, 502, createUnavailableSemanticPlan(transcript));
            return;
          }

          const openAIResponse = await fetchImpl("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              createOpenAIResponsesRequestBody({
                canvasState,
                model: env.VOXCANVAS_LLM_MODEL || OPENAI_SEMANTIC_PLANNER_MODEL,
                transcript,
              }),
            ),
          });

          if (!openAIResponse.ok) {
            sendJson(apiResponse, 502, createUnavailableSemanticPlan(transcript));
            return;
          }

          sendJson(
            apiResponse,
            200,
            extractSemanticPlanFromOpenAIResponse(await openAIResponse.json()),
          );
        } catch {
          sendJson(apiResponse, 502, createUnavailableSemanticPlan(transcript));
        }
      });
    },
  };
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

function sendJson(
  response: DevServerResponse,
  statusCode: number,
  payload: RawSemanticPlanResult | { error: string },
) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function createUnavailableSemanticPlan(transcript: string): RawSemanticPlanResult {
  return {
    status: "unsupported",
    route: "unsupported",
    intent: "unknown",
    confidence: 0,
    normalizedTranscript: transcript,
    operations: [],
    operationPreview: [],
    feedback: ["LLM 语义规划暂不可用，已保留安全失败状态"],
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

function getProcessCwd() {
  return (globalThis as unknown as { process: RuntimeProcess }).process.cwd();
}
