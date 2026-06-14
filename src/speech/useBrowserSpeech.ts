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
  const [isTranscriptFinal, setIsTranscriptFinal] = useState(false);
  const [transcriptRevision, setTranscriptRevision] = useState(0);
  const [speechError, setSpeechError] = useState<string | null>(
    isSupported ? null : "Browser speech recognition is unavailable.",
  );

  useEffect(() => {
    let lastFinalRawTranscript = "";

    const unsubscribeResult = provider.onResult((result) => {
      const nextTranscript = getNewTranscriptSegment(
        result.transcript,
        lastFinalRawTranscript,
      );

      if (result.isFinal) {
        lastFinalRawTranscript = result.transcript;
      }

      setTranscript(nextTranscript);
      setIsTranscriptFinal(result.isFinal);
      setTranscriptRevision((revision) => revision + 1);
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

  const updateTranscript = useCallback((nextTranscript: string) => {
    setTranscript(nextTranscript);
    setIsTranscriptFinal(true);
    setTranscriptRevision((revision) => revision + 1);
    setSpeechError(null);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setIsTranscriptFinal(false);
  }, []);

  return {
    clearTranscript,
    isSupported,
    isTranscriptFinal,
    speechError,
    speechStatus,
    start,
    stop,
    transcript,
    transcriptRevision,
    updateTranscript,
  };
}

function getNewTranscriptSegment(transcript: string, lastFinalRawTranscript: string) {
  const trimmedTranscript = transcript.trim();
  const trimmedPrefix = lastFinalRawTranscript.trim();

  if (!trimmedPrefix || !trimmedTranscript.startsWith(trimmedPrefix)) {
    return trimmedTranscript;
  }

  return trimmedTranscript.slice(trimmedPrefix.length).trim();
}
