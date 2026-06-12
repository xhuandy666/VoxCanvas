import { describe, expect, it, vi } from "vitest";
import { createEmptyCanvasState } from "../drawing/drawingState";
import { createRemoteSemanticPlanner } from "./semanticPlannerClient";

describe("createRemoteSemanticPlanner", () => {
  it("posts unsupported parser requests to the semantic planning endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "matched",
        route: "structured_drawing",
        intent: "create_shape",
        confidence: 0.91,
        normalizedTranscript: "画一个圆形",
        operations: [
          {
            type: "create_shape",
            shape: {
              id: "llm-circle-1",
              kind: "circle",
              x: 410,
              y: 230,
              width: 140,
              height: 140,
              rotation: 0,
              style: {
                fill: "#2563eb",
                stroke: "#1d4ed8",
                strokeWidth: 2,
              },
            },
          },
        ],
        operationPreview: ["add shape: circle, color: blue"],
        feedback: ["已将“园”理解为圆形"],
      }),
    });

    const planner = createRemoteSemanticPlanner({ fetchImpl });
    const result = await planner({
      canvasState: createEmptyCanvasState(),
      parserResult: {
        status: "unsupported",
        intent: "unknown",
        operations: [],
        operationPreview: [],
        feedback: ["暂时无法解析这条绘图指令"],
        normalizedTranscript: "画一个园",
      },
      transcript: "画一个园",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/semantic-plan",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({
      transcript: "画一个园",
      parserStatus: "unsupported",
    });
    expect(result).toMatchObject({
      status: "matched",
      intent: "create_shape",
      normalizedTranscript: "画一个圆形",
    });
  });

  it("returns a safe fallback when the semantic planning endpoint is unavailable", async () => {
    const planner = createRemoteSemanticPlanner({
      fetchImpl: vi.fn().mockRejectedValue(new Error("network down")),
    });

    const result = await planner({
      canvasState: createEmptyCanvasState(),
      parserResult: {
        status: "unsupported",
        intent: "unknown",
        operations: [],
        operationPreview: [],
        feedback: ["暂时无法解析这条绘图指令"],
        normalizedTranscript: "画一只蓝色的鸟",
      },
      transcript: "画一只蓝色的鸟",
    });

    expect(result).toMatchObject({
      status: "unsupported",
      route: "unsupported",
      intent: "unknown",
      operations: [],
      feedback: ["LLM 语义规划暂不可用，已保留安全失败状态"],
    });
  });
});
