import type { MockAppState } from "../types/appState";

export const mockAppState: MockAppState = {
  speechStatus: "idle",
  language: "zh-CN",
  transcript: "",
  parsedIntent: "unknown",
  operationPreview: ["no operation preview"],
  feedbackLog: ["等待语音输入"],
};
