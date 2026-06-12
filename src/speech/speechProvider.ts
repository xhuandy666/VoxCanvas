export type SpeechStatus = "idle" | "listening" | "unsupported" | "error";

export type SpeechErrorCode =
  | "unsupported"
  | "not_allowed"
  | "network"
  | "aborted"
  | "no_speech"
  | "unknown";

export type SpeechResult = {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  language: string;
  receivedAt: number;
};

export type SpeechProviderError = {
  code: SpeechErrorCode;
  message: string;
};

export type SpeechProviderListener<T> = (value: T) => void;

export type SpeechProvider = {
  isSupported(): boolean;
  start(): Promise<void>;
  stop(): void;
  onResult(listener: SpeechProviderListener<SpeechResult>): () => void;
  onError(listener: SpeechProviderListener<SpeechProviderError>): () => void;
  onStatusChange(listener: SpeechProviderListener<SpeechStatus>): () => void;
};

export type SpeechRecognitionAlternativeLike = {
  transcript: string;
  confidence?: number;
};

export type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
};

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

export type SpeechRecognitionErrorEventLike = {
  error: string;
  message?: string;
};

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
};
