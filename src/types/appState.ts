import type { SpeechStatus } from "../speech/speechProvider";

export type { SpeechStatus };

export type MockAppState = {
  speechStatus: SpeechStatus;
  language: string;
  transcript: string;
  recognizedText?: string;
  parsedIntent: string;
  operationPreview: string[];
  feedbackLog: string[];
};
