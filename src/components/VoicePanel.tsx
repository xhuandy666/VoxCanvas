import type { MockAppState } from "../types/appState";

type VoicePanelProps = {
  state: MockAppState;
};

export function VoicePanel({ state }: VoicePanelProps) {
  return (
    <section className="panel voice-panel" aria-labelledby="voice-panel-title">
      <div className="panel-header">
        <p className="panel-kicker">Input</p>
        <h2 id="voice-panel-title">Voice control</h2>
      </div>

      <dl className="status-list">
        <div>
          <dt>Mic status</dt>
          <dd>{state.speechStatus}</dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{state.language}</dd>
        </div>
      </dl>

      <button className="primary-button" type="button">
        Start voice
      </button>

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
