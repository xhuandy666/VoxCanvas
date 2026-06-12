import { parseCommand, type CommandParseResult, type ParseCommandOptions } from "./commandParser";
import type { SemanticPlanResult } from "../planning/semanticPlanner";

export type CommandTraceState = {
  parsedIntent: string;
  operationPreview: string[];
  feedbackLog: string[];
};

export function createCommandTraceStateFromResult(
  result: CommandParseResult,
): CommandTraceState {
  return {
    parsedIntent: result.intent,
    operationPreview:
      result.operationPreview.length > 0
        ? result.operationPreview
        : ["no operation preview"],
    feedbackLog: result.feedback,
  };
}

export function createCommandTraceStateFromSemanticPlan(
  plan: SemanticPlanResult,
): CommandTraceState {
  const operationPreview =
    plan.clarification !== undefined
      ? [`clarification required: ${plan.clarification.reason}`]
      : plan.operationPreview;

  return {
    parsedIntent: plan.intent,
    operationPreview:
      operationPreview.length > 0 ? operationPreview : ["no operation preview"],
    feedbackLog: plan.feedback,
  };
}

export function createCommandTraceState(
  transcript: string,
  options: ParseCommandOptions = {},
): CommandTraceState {
  return createCommandTraceStateFromResult(parseCommand(transcript, options));
}
