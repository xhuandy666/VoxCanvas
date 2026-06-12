import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserSpeechProvider } from "./browserSpeechProvider";
import type { SpeechProviderError, SpeechStatus } from "./speechProvider";

type UseBrowserSpeechOptions = {
  initialTranscript: string;
  language: string;
};

export function useBrowserSpeech({ initialTranscript, language }: UseBrowserSpeechOptions) {
  const provider = useMemo(() => new BrowserSpeechProvider({ language }), [language]);
  const isSupported = useMemo(() => provider.isSupported(), [provider]);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>(
    isSupported ? "idle" : "unsupported",
  );
  const [transcript, setTranscript] = useState(initialTranscript);
  const [speechError, setSpeechError] = useState<string | null>(
    isSupported ? null : "Browser speech recognition is unavailable.",
  );

  useEffect(() => {
    const unsubscribeResult = provider.onResult((result) => {
      setTranscript(result.transcript);
      setSpeechError(null);
    });
    const unsubscribeError = provider.onError((error) => {
      setSpeechError(error.message);
    });
    const unsubscribeStatus = provider.onStatusChange((status) => {
      setSpeechStatus(status);
    });

    return () => {
      unsubscribeResult();
      unsubscribeError();
      unsubscribeStatus();
      provider.stop();
    };
  }, [provider]);

  const start = useCallback(async () => {
    setSpeechError(null);

    try {
      await provider.start();
    } catch (error) {
      const providerError = error as SpeechProviderError;
      setSpeechError(providerError.message);
    }
  }, [provider]);

  const stop = useCallback(() => {
    provider.stop();
  }, [provider]);

  return {
    isSupported,
    speechError,
    speechStatus,
    start,
    stop,
    transcript,
  };
}
