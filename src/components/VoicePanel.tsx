import type { MockAppState } from "../types/appState";
import type { SpeechStatus } from "../speech/speechProvider";

type VoicePanelProps = {
  onStart?: () => void | Promise<void>;
  onStop?: () => void;
  speechError?: string | null;
  speechStatus?: SpeechStatus;
  state: MockAppState;
};

export function VoicePanel({
  onStart,
  onStop,
  speechError = null,
  speechStatus,
  state,
}: VoicePanelProps) {
  const currentSpeechStatus = speechStatus ?? state.speechStatus;
  const isUnsupported = currentSpeechStatus === "unsupported";
  const isListening = currentSpeechStatus === "listening";

  return (
    <section className="panel voice-panel" aria-labelledby="voice-panel-title">
      <div className="panel-header">
        <p className="panel-kicker">Input</p>
        <h2 id="voice-panel-title">Voice control</h2>
      </div>

      <dl className="status-list">
        <div>
          <dt>Mic status</dt>
          <dd>{currentSpeechStatus}</dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{state.language}</dd>
        </div>
      </dl>

      <div className="voice-controls">
        <button
          className="primary-button"
          disabled={isUnsupported || isListening}
          onClick={onStart}
          type="button"
        >
          Start voice
        </button>
        <button
          className="ghost-button"
          disabled={!isListening}
          onClick={onStop}
          type="button"
        >
          Stop voice
        </button>
      </div>

      {speechError ? (
        <p className="speech-error" role="status">
          {speechError}
        </p>
      ) : null}

      <div className="transcript-block">
        <span className="field-label">Current transcript</span>
        <p className="transcript-preview">{state.transcript}</p>
      </div>

      <div className="dev-only">
        <span>Development only</span>
        <label htmlFor="transcript-simulate">Simulate transcript</label>
        <textarea
          id="transcript-simulate"
          name="transcript-simulate"
          rows={4}
          defaultValue={state.transcript}
        />
      </div>
    </section>
  );
}
