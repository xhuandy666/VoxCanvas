import { describe, expect, it } from "vitest";
import { createOpenAIResponsesRequestBody, extractSemanticPlanFromOpenAIResponse } from "./openAIResponsesPlanner";
import { createEmptyCanvasState } from "../drawing/drawingState";

describe("OpenAI Responses semantic planner helpers", () => {
  it("builds a structured Responses API request for semantic planning", () => {
    const body = createOpenAIResponsesRequestBody({
      canvasState: createEmptyCanvasState(),
      model: "gpt-5.4-mini",
      transcript: "画一个园",
    });

    expect(body).toMatchObject({
      model: "gpt-5.4-mini",
      text: {
        format: {
          type: "json_schema",
          name: "voxcanvas_semantic_plan",
          strict: true,
        },
      },
    });
    expect(body.text.format.schema).toMatchObject({
      type: "object",
      required: [
        "status",
        "route",
        "intent",
        "confidence",
        "normalizedTranscript",
        "operations",
        "operationPreview",
        "feedback",
      ],
    });
    expect(JSON.stringify(body)).toContain("画一个园");
    expect(JSON.stringify(body)).toContain("LLM 只负责语义理解");
  });

  it("extracts a semantic plan from Responses API output text", () => {
    const plan = {
      status: "matched",
      route: "structured_drawing",
      intent: "clear_canvas",
      confidence: 0.88,
      normalizedTranscript: "清空画布",
      operations: [{ type: "clear_canvas" }],
      operationPreview: ["clear canvas"],
      feedback: ["已将自然表达归一为清空画布"],
    };

    expect(
      extractSemanticPlanFromOpenAIResponse({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify(plan),
              },
            ],
          },
        ],
      }),
    ).toEqual(plan);
  });
});
