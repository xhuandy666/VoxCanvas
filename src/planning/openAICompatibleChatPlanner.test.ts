import { describe, expect, it } from "vitest";
import { createEmptyCanvasState } from "../drawing/drawingState";
import {
  createOpenAICompatibleChatRequestBody,
  DASHSCOPE_SEMANTIC_PLANNER_MODEL,
  extractSemanticPlanFromOpenAICompatibleChatResponse,
  stripJsonCodeFence,
} from "./openAICompatibleChatPlanner";

describe("OpenAI-compatible chat semantic planner helpers", () => {
  it("builds a chat request for DashScope semantic planning", () => {
    const body = createOpenAICompatibleChatRequestBody({
      canvasState: createEmptyCanvasState(),
      transcript: "重新来",
    });

    expect(body).toMatchObject({
      model: DASHSCOPE_SEMANTIC_PLANNER_MODEL,
    });
    expect(body.messages).toHaveLength(2);
    expect(JSON.stringify(body)).toContain("重新来");
    expect(JSON.stringify(body)).toContain("LLM 只负责语义理解");
  });

  it("extracts a semantic plan from chat completion message content", () => {
    const plan = {
      status: "matched",
      route: "structured_drawing",
      intent: "clear_canvas",
      confidence: 0.9,
      normalizedTranscript: "清空画布",
      operations: [{ type: "clear_canvas" }],
      operationPreview: ["clear canvas"],
      feedback: ["已将自然表达归一为清空画布"],
    };

    expect(
      extractSemanticPlanFromOpenAICompatibleChatResponse({
        choices: [
          {
            message: {
              content: JSON.stringify(plan),
            },
          },
        ],
      }),
    ).toEqual(plan);
  });

  it("extracts a semantic plan from fenced JSON chat content", () => {
    const plan = {
      status: "matched",
      route: "structured_drawing",
      intent: "clear_canvas",
      confidence: 0.9,
      normalizedTranscript: "重新来",
      operations: [{ type: "clear_canvas" }],
      operationPreview: ["clear canvas"],
      feedback: ["已将自然表达归一为清空画布"],
    };

    expect(
      extractSemanticPlanFromOpenAICompatibleChatResponse({
        choices: [
          {
            message: {
              content: `\`\`\`json\n${JSON.stringify(plan)}\n\`\`\``,
            },
          },
        ],
      }),
    ).toEqual(plan);
  });

  it("strips JSON code fences before parsing provider output", () => {
    expect(stripJsonCodeFence("```json\n{\"status\":\"matched\"}\n```")).toBe(
      "{\"status\":\"matched\"}",
    );
  });
});
