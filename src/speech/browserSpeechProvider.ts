import type {
  SpeechErrorCode,
  SpeechProvider,
  SpeechProviderError,
  SpeechProviderListener,
  SpeechRecognitionLike,
  SpeechResult,
  SpeechStatus,
} from "./speechProvider";

type BrowserSpeechProviderOptions = {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  recognitionFactory?: () => SpeechRecognitionLike | null;
};

type BrowserSpeechRecognitionScope = {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const DEFAULT_LANGUAGE = "zh-CN";

export class BrowserSpeechProvider implements SpeechProvider {
  private readonly continuous: boolean;
  private readonly interimResults: boolean;
  private readonly language: string;
  private readonly recognitionFactory: () => SpeechRecognitionLike | null;
  private recognition: SpeechRecognitionLike | null = null;
  private readonly resultListeners = new Set<SpeechProviderListener<SpeechResult>>();
  private readonly errorListeners = new Set<SpeechProviderListener<SpeechProviderError>>();
  private readonly statusListeners = new Set<SpeechProviderListener<SpeechStatus>>();

  constructor(options: BrowserSpeechProviderOptions = {}) {
    this.continuous = options.continuous ?? true;
    this.interimResults = options.interimResults ?? true;
    this.language = options.language ?? DEFAULT_LANGUAGE;
    this.recognitionFactory = options.recognitionFactory ?? createBrowserRecognition;
  }

  isSupported() {
    return this.recognitionFactory() !== null;
  }

  async start() {
    const recognition = this.recognitionFactory();

    if (!recognition) {
      const error = createSpeechError("unsupported");
      this.emitStatus("unsupported");
      this.emitError(error);
      throw error;
    }

    this.recognition = recognition;
    recognition.continuous = this.continuous;
    recognition.interimResults = this.interimResults;
    recognition.lang = this.language;
    recognition.onstart = () => this.emitStatus("listening");
    recognition.onend = () => this.emitStatus("idle");
    recognition.onerror = (event) => {
      this.emitStatus("error");
      this.emitError(createSpeechError(event.error, event.message));
    };
    recognition.onresult = (event) => this.handleResult(event);

    try {
      recognition.start();
    } catch (error) {
      const providerError = createSpeechError(
        "unknown",
        error instanceof Error ? error.message : undefined,
      );
      this.emitStatus("error");
      this.emitError(providerError);
      throw providerError;
    }
  }

  stop() {
    this.recognition?.stop();
  }

  onResult(listener: SpeechProviderListener<SpeechResult>) {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  onError(listener: SpeechProviderListener<SpeechProviderError>) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  onStatusChange(listener: SpeechProviderListener<SpeechStatus>) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private handleResult(event: Parameters<NonNullable<SpeechRecognitionLike["onresult"]>>[0]) {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const speechResult = event.results[index];
      const alternative = speechResult[0];
      const transcript = alternative.transcript.trim();

      if (!transcript) {
        continue;
      }

      this.emitResult({
        transcript,
        isFinal: speechResult.isFinal,
        confidence: alternative.confidence ?? 0,
        language: this.language,
        receivedAt: Date.now(),
      });
    }
  }

  private emitResult(result: SpeechResult) {
    this.resultListeners.forEach((listener) => listener(result));
  }

  private emitError(error: SpeechProviderError) {
    this.errorListeners.forEach((listener) => listener(error));
  }

  private emitStatus(status: SpeechStatus) {
    this.statusListeners.forEach((listener) => listener(status));
  }
}

function createBrowserRecognition() {
  const scope = getBrowserSpeechRecognitionScope();
  const RecognitionConstructor =
    scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;

  return RecognitionConstructor ? new RecognitionConstructor() : null;
}

function getBrowserSpeechRecognitionScope(): BrowserSpeechRecognitionScope {
  if (typeof window !== "undefined") {
    return window as BrowserSpeechRecognitionScope;
  }

  if (typeof globalThis !== "undefined") {
    return globalThis as BrowserSpeechRecognitionScope;
  }

  return {};
}

function createSpeechError(error: string, message?: string): SpeechProviderError {
  const code = mapSpeechErrorCode(error);

  return {
    code,
    message: message ?? getSpeechErrorMessage(code),
  };
}

function mapSpeechErrorCode(error: string): SpeechErrorCode {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "not_allowed";
    case "network":
      return "network";
    case "aborted":
      return "aborted";
    case "no-speech":
      return "no_speech";
    case "unsupported":
      return "unsupported";
    default:
      return "unknown";
  }
}

function getSpeechErrorMessage(code: SpeechErrorCode) {
  switch (code) {
    case "unsupported":
      return "Browser speech recognition is unavailable.";
    case "not_allowed":
      return "Microphone permission was denied.";
    case "network":
      return "Speech recognition failed because of a network error.";
    case "aborted":
      return "Speech recognition was aborted.";
    case "no_speech":
      return "No speech was detected.";
    case "unknown":
      return "Speech recognition failed.";
  }
}
