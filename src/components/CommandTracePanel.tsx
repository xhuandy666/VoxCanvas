import type { MockAppState } from "../types/appState";

type CommandTracePanelProps = {
  state: MockAppState;
};

export function CommandTracePanel({ state }: CommandTracePanelProps) {
  return (
    <section className="panel trace-panel" aria-labelledby="trace-panel-title">
      <div className="panel-header">
        <p className="panel-kicker">Interpretation</p>
        <h2 id="trace-panel-title">Command trace</h2>
      </div>

      <div className="trace-block">
        <h3>Recognized text</h3>
        <p>{state.recognizedText ?? state.transcript}</p>
      </div>

      <div className="trace-block">
        <h3>Parsed intent</h3>
        <code>{state.parsedIntent}</code>
      </div>

      <div className="trace-block">
        <h3>Operation preview</h3>
        <ul>
          {state.operationPreview.map((operation) => (
            <li key={operation}>{operation}</li>
          ))}
        </ul>
      </div>

      <div className="trace-block">
        <h3>Feedback log</h3>
        <ol className="feedback-list">
          {state.feedbackLog.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
