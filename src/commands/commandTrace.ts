import { parseCommand } from "./commandParser";

export type CommandTraceState = {
  parsedIntent: string;
  operationPreview: string[];
  feedbackLog: string[];
};

export function createCommandTraceState(transcript: string): CommandTraceState {
  const result = parseCommand(transcript);

  return {
    parsedIntent: result.intent,
    operationPreview:
      result.operationPreview.length > 0
        ? result.operationPreview
        : ["no operation preview"],
    feedbackLog: result.feedback,
  };
}
