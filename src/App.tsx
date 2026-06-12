import { useEffect, useRef, useState } from "react";
import { CanvasStage } from "./components/CanvasStage";
import { CommandTracePanel } from "./components/CommandTracePanel";
import { TopBar } from "./components/TopBar";
import { VoicePanel } from "./components/VoicePanel";
import { parseCommand } from "./commands/commandParser";
import { createCommandTraceState } from "./commands/commandTrace";
import { mockAppState } from "./data/mockAppState";
import { createEmptyCanvasState } from "./drawing/drawingState";
import {
  createOperationQueueState,
  executeOperationBatch,
} from "./operations/operationQueue";
import { useBrowserSpeech } from "./speech/useBrowserSpeech";

export default function App() {
  const browserSpeech = useBrowserSpeech({
    initialTranscript: mockAppState.transcript,
    language: mockAppState.language,
  });
  const hasSkippedInitialTranscript = useRef(false);
  const [drawingSession, setDrawingSession] = useState(() => ({
    canvasState: createEmptyCanvasState(),
    queueState: createOperationQueueState(),
  }));

  useEffect(() => {
    if (!hasSkippedInitialTranscript.current) {
      hasSkippedInitialTranscript.current = true;
      return;
    }

    setDrawingSession((currentSession) => {
      const nextShapeNumber = currentSession.queueState.executedBatchIds.length + 1;
      const commandResult = parseCommand(browserSpeech.transcript, {
        createShapeId: (kind) => `voice-${kind}-${nextShapeNumber}`,
      });

      if (commandResult.status !== "matched" || commandResult.operations.length === 0) {
        return currentSession;
      }

      const result = executeOperationBatch(
        currentSession.canvasState,
        currentSession.queueState,
        {
          id: commandResult.normalizedTranscript,
          operations: commandResult.operations,
        },
      );

      if (!result.executed) {
        return currentSession;
      }

      return {
        canvasState: result.canvasState,
        queueState: result.queueState,
      };
    });
  }, [browserSpeech.transcript]);

  const appState = {
    ...mockAppState,
    ...createCommandTraceState(browserSpeech.transcript),
    speechStatus: browserSpeech.speechStatus,
    transcript: browserSpeech.transcript,
  };

  return (
    <div className="app-shell">
      <TopBar />
      <div className="workbench" aria-label="VoxCanvas workbench">
        <CanvasStage state={drawingSession.canvasState} />
        <VoicePanel
          onStart={browserSpeech.start}
          onStop={browserSpeech.stop}
          onTranscriptChange={browserSpeech.updateTranscript}
          speechError={browserSpeech.speechError}
          speechStatus={browserSpeech.speechStatus}
          state={appState}
        />
        <CommandTracePanel state={appState} />
      </div>
    </div>
  );
}
