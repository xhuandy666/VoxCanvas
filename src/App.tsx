import { CanvasStage } from "./components/CanvasStage";
import { CommandTracePanel } from "./components/CommandTracePanel";
import { TopBar } from "./components/TopBar";
import { VoicePanel } from "./components/VoicePanel";
import { demoCanvasState } from "./data/demoCanvasState";
import { mockAppState } from "./data/mockAppState";

export default function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="workbench" aria-label="VoxCanvas workbench">
        <CanvasStage state={demoCanvasState} />
        <VoicePanel state={mockAppState} />
        <CommandTracePanel state={mockAppState} />
      </div>
    </div>
  );
}
