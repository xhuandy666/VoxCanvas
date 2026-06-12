export type SpeechStatus = "idle" | "unsupported" | "ready";

export type MockAppState = {
  speechStatus: SpeechStatus;
  language: string;
  transcript: string;
  parsedIntent: string;
  operationPreview: string[];
  feedbackLog: string[];
};
