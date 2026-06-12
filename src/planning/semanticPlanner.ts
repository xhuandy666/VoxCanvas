import {
  parseCommand,
  type CommandIntent,
  type CommandParseResult,
  type ParseCommandOptions,
} from "../commands/commandParser";
import { createEmptyCanvasState, type CanvasState, type DrawingOperation } from "../drawing/drawingState";
import { validateDrawingOperations } from "./operationValidator";

export type SemanticPlanStatus = "matched" | "unsupported" | "needs_clarification";

export type SemanticPlanRoute =
  | "structured_drawing"
  | "clarification"
  | "unsupported"
  | "ai_image_generation"
  | "image_editing";

export type SemanticPlanSource =
  | "rule_parser"
  | "mock_semantic_planner"
  | "llm_semantic_planner";

export type ClarificationState = {
  reason: string;
  question: string;
  suggestions: string[];
};

export type SemanticPlanResult = {
  status: SemanticPlanStatus;
  route: SemanticPlanRoute;
  intent: CommandIntent | "clarify_command" | "clarify_reference";
  source: SemanticPlanSource;
  confidence: number;
  normalizedTranscript: string;
  operations: DrawingOperation[];
  operationPreview: string[];
  feedback: string[];
  clarification?: ClarificationState;
};

export type RawSemanticPlanResult = Omit<SemanticPlanResult, "operations" | "source"> & {
  operations: unknown[];
};

export type SemanticPlannerRequest = {
  canvasState: CanvasState;
  parserResult: CommandParseResult;
  transcript: string;
};

export type SemanticPlanner = (
  request: SemanticPlannerRequest,
) => RawSemanticPlanResult | Promise<RawSemanticPlanResult>;

export type SemanticPlanOptions = ParseCommandOptions & {
  semanticPlanner?: SemanticPlanner;
  semanticPlannerSource?: SemanticPlanSource;
};

export function createSemanticPlan(
  transcript: string,
  options: SemanticPlanOptions = {},
): SemanticPlanResult {
  const canvasState = options.canvasState ?? createEmptyCanvasState();
  const parserResult = parseCommand(transcript, options);

  if (parserResult.status === "matched") {
    return createValidatedPlan(
      {
        status: "matched",
        route: "structured_drawing",
        intent: parserResult.intent,
        confidence: 1,
        normalizedTranscript: parserResult.normalizedTranscript,
        operations: parserResult.operations,
        operationPreview: parserResult.operationPreview,
        feedback: parserResult.feedback,
      },
      canvasState,
      "rule_parser",
    );
  }

  const planner = options.semanticPlanner ?? createMockSemanticPlanner;
  const rawPlan = planner({
    canvasState,
    parserResult,
    transcript,
  });

  if (isPromiseLike(rawPlan)) {
    throw new Error("createSemanticPlan received an async planner; use createSemanticPlanAsync instead");
  }

  return createValidatedPlan(
    rawPlan,
    canvasState,
    options.semanticPlannerSource ?? "mock_semantic_planner",
  );
}

export async function createSemanticPlanAsync(
  transcript: string,
  options: SemanticPlanOptions = {},
): Promise<SemanticPlanResult> {
  const canvasState = options.canvasState ?? createEmptyCanvasState();
  const parserResult = parseCommand(transcript, options);

  if (parserResult.status === "matched") {
    return createValidatedPlan(
      {
        status: "matched",
        route: "structured_drawing",
        intent: parserResult.intent,
        confidence: 1,
        normalizedTranscript: parserResult.normalizedTranscript,
        operations: parserResult.operations,
        operationPreview: parserResult.operationPreview,
        feedback: parserResult.feedback,
      },
      canvasState,
      "rule_parser",
    );
  }

  const planner = options.semanticPlanner ?? createMockSemanticPlanner;
  const rawPlan = await planner({
    canvasState,
    parserResult,
    transcript,
  });

  return createValidatedPlan(
    rawPlan,
    canvasState,
    options.semanticPlannerSource ??
      (options.semanticPlanner ? "llm_semantic_planner" : "mock_semantic_planner"),
  );
}

function createMockSemanticPlanner(
  request: SemanticPlannerRequest,
): RawSemanticPlanResult {
  const normalizedTranscript = request.parserResult.normalizedTranscript;

  if (!normalizedTranscript) {
    return {
      status: "needs_clarification",
      route: "clarification",
      intent: "clarify_command",
      confidence: 0,
      normalizedTranscript,
      operations: [],
      operationPreview: [],
      feedback: ["等待语音输入"],
      clarification: {
        reason: "empty_transcript",
        question: "请说出一个绘图、编辑或历史操作指令。",
        suggestions: ["画一个蓝色圆形", "清空画布"],
      },
    };
  }

  if (isReferenceCommand(normalizedTranscript)) {
    return {
      status: "needs_clarification",
      route: "clarification",
      intent: "clarify_reference",
      confidence: 0.4,
      normalizedTranscript,
      operations: [],
      operationPreview: [],
      feedback: ["需要澄清：我还没有找到可引用的对象。"],
      clarification: {
        reason: "missing_reference",
        question: "你想先创建一个图形，还是重新描述要编辑的对象？",
        suggestions: ["先画一个圆形", "重新描述目标对象"],
      },
    };
  }

  return {
    status: "unsupported",
    route: "unsupported",
    intent: "unknown",
    confidence: 0,
    normalizedTranscript,
    operations: [],
    operationPreview: [],
    feedback: ["语义规划基础已就绪，但当前没有可安全执行的结构化计划"],
  };
}

function createValidatedPlan(
  plan: RawSemanticPlanResult,
  canvasState: CanvasState,
  source: SemanticPlanSource,
): SemanticPlanResult {
  if (plan.status !== "matched") {
    return {
      ...plan,
      source,
      operations: [],
      operationPreview: plan.operationPreview,
      feedback: plan.feedback,
    };
  }

  if (plan.route !== "structured_drawing") {
    return createBlockedPlan(plan, source, ["当前语义路线尚未接入可执行流程"]);
  }

  const validation = validateDrawingOperations(plan.operations, canvasState);

  if (!validation.valid) {
    return createBlockedPlan(
      plan,
      source,
      validation.errors.map((error) => error.reason),
    );
  }

  return {
    ...plan,
    source,
    operations: validation.operations,
  };
}

function createBlockedPlan(
  plan: RawSemanticPlanResult,
  source: SemanticPlanSource,
  reasons: string[],
): SemanticPlanResult {
  const uniqueReasons = [...new Set(reasons)];

  return {
    status: "unsupported",
    route: "unsupported",
    intent: "unknown",
    source,
    confidence: plan.confidence,
    normalizedTranscript: plan.normalizedTranscript,
    operations: [],
    operationPreview: [],
    feedback: [`语义规划结果包含非法操作，已阻止执行：${uniqueReasons.join("；")}`],
  };
}

function isReferenceCommand(transcript: string) {
  return /(它|这个|那个|刚才)/.test(transcript);
}

function isPromiseLike(value: unknown): value is Promise<RawSemanticPlanResult> {
  return isRecord(value) && typeof value.then === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
