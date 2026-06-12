import { CanvasStage } from "./components/CanvasStage";
import { CommandTracePanel } from "./components/CommandTracePanel";
import { TopBar } from "./components/TopBar";
import { VoicePanel } from "./components/VoicePanel";
import { demoCanvasState } from "./data/demoCanvasState";
import { mockAppState } from "./data/mockAppState";
import { useBrowserSpeech } from "./speech/useBrowserSpeech";

export default function App() {
  const browserSpeech = useBrowserSpeech({
    initialTranscript: mockAppState.transcript,
    language: mockAppState.language,
  });
  const appState = {
    ...mockAppState,
    speechStatus: browserSpeech.speechStatus,
    transcript: browserSpeech.transcript,
  };

  return (
    <div className="app-shell">
      <TopBar />
      <div className="workbench" aria-label="VoxCanvas workbench">
        <CanvasStage state={demoCanvasState} />
        <VoicePanel
          onStart={browserSpeech.start}
          onStop={browserSpeech.stop}
          speechError={browserSpeech.speechError}
          speechStatus={browserSpeech.speechStatus}
          state={appState}
        />
        <CommandTracePanel state={appState} />
      </div>
    </div>
  );
}
