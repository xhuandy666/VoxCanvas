import type { CanvasState } from "../drawing/drawingState";
import type { RawSemanticPlanResult } from "./semanticPlanner";

export const OPENAI_SEMANTIC_PLANNER_MODEL = "gpt-5.4-mini";

type CreateOpenAIResponsesRequestBodyOptions = {
  canvasState: CanvasState;
  model?: string;
  transcript: string;
};

type ResponseContent = {
  type?: unknown;
  text?: unknown;
};

type ResponseOutput = {
  content?: unknown;
};

export const semanticPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
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
  properties: {
    status: {
      type: "string",
      enum: ["matched", "unsupported", "needs_clarification"],
    },
    route: {
      type: "string",
      enum: [
        "structured_drawing",
        "clarification",
        "unsupported",
        "ai_image_generation",
        "image_editing",
      ],
    },
    intent: {
      type: "string",
      enum: [
        "create_shape",
        "create_template",
        "create_image_layer",
        "update_image_layer",
        "delete_image_layer",
        "update_shape",
        "move_shape",
        "delete_shape",
        "clear_canvas",
        "undo",
        "redo",
        "unknown",
        "clarify_command",
        "clarify_reference",
      ],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    normalizedTranscript: {
      type: "string",
    },
    operations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
      },
    },
    operationPreview: {
      type: "array",
      items: {
        type: "string",
      },
    },
    feedback: {
      type: "array",
      items: {
        type: "string",
      },
    },
    clarification: {
      type: "object",
      additionalProperties: false,
      required: ["reason", "question", "suggestions"],
      properties: {
        reason: {
          type: "string",
        },
        question: {
          type: "string",
        },
        suggestions: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
    },
  },
} as const;

export function createOpenAIResponsesRequestBody({
  canvasState,
  model = OPENAI_SEMANTIC_PLANNER_MODEL,
  transcript,
}: CreateOpenAIResponsesRequestBodyOptions) {
  return {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: createSemanticPlannerSystemPrompt(),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: createSemanticPlannerUserPrompt({ canvasState, transcript }),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "voxcanvas_semantic_plan",
        strict: true,
        schema: semanticPlanJsonSchema,
      },
    },
  };
}

export function createSemanticPlannerSystemPrompt() {
  return [
    "你是 VoxCanvas 的 LLM Semantic Planner。",
    "LLM 只负责语义理解、纠错、任务路由、澄清问题和结构化规划。",
    "不要直接修改 DOM、SVG、CanvasState，不要输出前端代码。",
    "简单结构化绘图只能输出合法 DrawingOperation 候选，后续会经过 OperationValidator。",
    "当前支持的 shape.kind 包括 circle、rectangle、line、arrow、text、triangle、diamond、ellipse。",
    "房子草图和流程图可以使用 create_template intent 表达模板意图，operations 仍必须展开为合法 DrawingOperation。",
    "AI 生图与语音改图路线当前只做任务路由，不要在语义规划里伪造图片 URL。",
    "如果用户意图模糊或目标对象不存在，使用 needs_clarification。",
    "如果用户请求复杂视觉对象或风格化画面，route 使用 ai_image_generation，operations 为空。",
    "如果用户请求基于旧生成图的风格或内容修改，route 使用 image_editing，operations 为空。",
    "只返回一个 JSON object，不要返回 Markdown、代码块或额外解释。",
  ].join("\n");
}

export function createSemanticPlannerUserPrompt({
  canvasState,
  transcript,
}: CreateOpenAIResponsesRequestBodyOptions) {
  return JSON.stringify(
    {
      transcript,
      canvasState: summarizeCanvasState(canvasState),
      responseContract: {
        status: "matched | unsupported | needs_clarification",
        route:
          "structured_drawing | clarification | unsupported | ai_image_generation | image_editing",
        operations:
          "Only include DrawingOperation objects when route is structured_drawing and status is matched.",
      },
    },
    null,
    2,
  );
}

export function extractSemanticPlanFromOpenAIResponse(
  response: unknown,
): RawSemanticPlanResult {
  const outputText = findOutputText(response);

  if (!outputText) {
    throw new Error("OpenAI Responses output did not include output_text");
  }

  const parsed = JSON.parse(outputText) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("OpenAI Responses output_text was not a semantic plan object");
  }

  return parsed as RawSemanticPlanResult;
}

function summarizeCanvasState(canvasState: CanvasState) {
  return {
    selectedShapeId: canvasState.selectedShapeId,
    lastShapeId: canvasState.lastShapeId,
    selectedImageLayerId: canvasState.selectedImageLayerId,
    lastImageLayerId: canvasState.lastImageLayerId,
    version: canvasState.version,
    shapes: canvasState.shapes.map((shape) => ({
      id: shape.id,
      kind: shape.kind,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      text: shape.text,
      style: shape.style,
    })),
    imageLayers: canvasState.imageLayers.map((layer) => ({
      id: layer.id,
      prompt: layer.prompt,
      status: layer.status,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      imageUrl: layer.imageUrl,
      model: layer.model,
      revisedPrompt: layer.revisedPrompt,
      errorMessage: layer.errorMessage,
    })),
  };
}

function findOutputText(response: unknown): string | null {
  if (!isRecord(response)) {
    return null;
  }

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) {
    return null;
  }

  for (const output of response.output as ResponseOutput[]) {
    if (!isRecord(output) || !Array.isArray(output.content)) {
      continue;
    }

    const textContent = output.content.find(
      (content: ResponseContent) =>
        isRecord(content) &&
        content.type === "output_text" &&
        typeof content.text === "string",
    );

    if (isRecord(textContent) && typeof textContent.text === "string") {
      return textContent.text;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
