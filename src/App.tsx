import { CanvasStage } from "./components/CanvasStage";
import { CommandTracePanel } from "./components/CommandTracePanel";
import { TopBar } from "./components/TopBar";
import { VoicePanel } from "./components/VoicePanel";
import { mockAppState } from "./data/mockAppState";

export default function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="workbench" aria-label="VoiceCanvas AI workbench">
        <VoicePanel state={mockAppState} />
        <CanvasStage />
        <CommandTracePanel state={mockAppState} />
      </div>
    </div>
  );
}
