import { parseCommand, type CommandParseResult, type ParseCommandOptions } from "./commandParser";

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

export function createCommandTraceState(
  transcript: string,
  options: ParseCommandOptions = {},
): CommandTraceState {
  return createCommandTraceStateFromResult(parseCommand(transcript, options));
}
