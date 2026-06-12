import type { RawSemanticPlanResult, SemanticPlanner, SemanticPlannerRequest } from "./semanticPlanner";

type FetchResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
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

type RemoteSemanticPlannerOptions = {
  endpoint?: string;
  fetchImpl?: FetchLike;
};

export function createRemoteSemanticPlanner({
  endpoint = "/api/semantic-plan",
  fetchImpl = getDefaultFetch(),
}: RemoteSemanticPlannerOptions = {}): SemanticPlanner {
  return async (request) => {
    if (!fetchImpl) {
      return createUnavailableSemanticPlan(request);
    }

    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createSemanticPlanPayload(request)),
      });

      if (!response.ok) {
        return createUnavailableSemanticPlan(request);
      }

      const payload = await response.json();

      if (!isRecord(payload)) {
        return createUnavailableSemanticPlan(request);
      }

      return payload as RawSemanticPlanResult;
    } catch {
      return createUnavailableSemanticPlan(request);
    }
  };
}

function createSemanticPlanPayload(request: SemanticPlannerRequest) {
  return {
    transcript: request.transcript,
    parserStatus: request.parserResult.status,
    parserIntent: request.parserResult.intent,
    parserFeedback: request.parserResult.feedback,
    normalizedTranscript: request.parserResult.normalizedTranscript,
    canvasState: request.canvasState,
  };
}

function createUnavailableSemanticPlan(
  request: SemanticPlannerRequest,
): RawSemanticPlanResult {
  return {
    status: "unsupported",
    route: "unsupported",
    intent: "unknown",
    confidence: 0,
    normalizedTranscript: request.parserResult.normalizedTranscript,
    operations: [],
    operationPreview: [],
    feedback: ["LLM 语义规划暂不可用，已保留安全失败状态"],
  };
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
