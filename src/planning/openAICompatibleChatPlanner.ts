import type { CanvasState } from "../drawing/drawingState";
import type { RawSemanticPlanResult } from "./semanticPlanner";
import {
  createSemanticPlannerSystemPrompt,
  createSemanticPlannerUserPrompt,
} from "./openAIResponsesPlanner";

export const DASHSCOPE_SEMANTIC_PLANNER_MODEL = "qwen3.6-flash";

type CreateOpenAICompatibleChatRequestBodyOptions = {
  canvasState: CanvasState;
  model?: string;
  transcript: string;
};

type ChatChoice = {
  message?: unknown;
};

export function createOpenAICompatibleChatRequestBody({
  canvasState,
  model = DASHSCOPE_SEMANTIC_PLANNER_MODEL,
  transcript,
}: CreateOpenAICompatibleChatRequestBodyOptions) {
  return {
    model,
    messages: [
      {
        role: "system",
        content: createSemanticPlannerSystemPrompt(),
      },
      {
        role: "user",
        content: createSemanticPlannerUserPrompt({
          canvasState,
          model,
          transcript,
        }),
      },
    ],
  };
}

export function extractSemanticPlanFromOpenAICompatibleChatResponse(
  response: unknown,
): RawSemanticPlanResult {
  const content = stripJsonCodeFence(findAssistantMessageContent(response));

  if (!content) {
    throw new Error("OpenAI-compatible chat output did not include message content");
  }

  const parsed = JSON.parse(content) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("OpenAI-compatible chat content was not a semantic plan object");
  }

  return parsed as RawSemanticPlanResult;
}

export function stripJsonCodeFence(content: string | null) {
  if (!content) {
    return null;
  }

  const trimmed = content.trim();
  const fencedJson = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fencedJson ? fencedJson[1].trim() : trimmed;
}

function findAssistantMessageContent(response: unknown) {
  if (!isRecord(response) || !Array.isArray(response.choices)) {
    return null;
  }

  for (const choice of response.choices as ChatChoice[]) {
    if (!isRecord(choice) || !isRecord(choice.message)) {
      continue;
    }

    if (typeof choice.message.content === "string") {
      return choice.message.content;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
