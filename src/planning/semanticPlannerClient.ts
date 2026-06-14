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

      const payload = await readJsonPayload(response);

      if (isRawSemanticPlanResult(payload)) {
        return payload;
      }

      if (!response.ok) {
        return createUnavailableSemanticPlan(
          request,
          getEndpointFailureReason(payload, response.status),
        );
      }

      return createUnavailableSemanticPlan(request, "端点返回了无法识别的语义规划结果");
    } catch {
      return createUnavailableSemanticPlan(request, "无法连接本地语义规划端点");
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
    normalizedTranscript: request.parserResult.normalizedTranscript,
    operations: [],
    operationPreview: [],
    feedback,
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

async function readJsonPayload(response: FetchResponse) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRawSemanticPlanResult(value: unknown): value is RawSemanticPlanResult {
  return (
    isRecord(value) &&
    typeof value.status === "string" &&
    typeof value.route === "string" &&
    typeof value.intent === "string" &&
    Array.isArray(value.operations) &&
    Array.isArray(value.operationPreview) &&
    Array.isArray(value.feedback)
  );
}

function getEndpointFailureReason(payload: unknown, status?: number) {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }

  return `语义规划端点返回 HTTP ${status ?? "错误"}`;
}
