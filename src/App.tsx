import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasStage } from "./components/CanvasStage";
import { CommandTracePanel } from "./components/CommandTracePanel";
import { TopBar } from "./components/TopBar";
import { VoicePanel } from "./components/VoicePanel";
import { parseCommand } from "./commands/commandParser";
import {
  createCommandTraceState,
  createCommandTraceStateFromResult,
} from "./commands/commandTrace";
import { mockAppState } from "./data/mockAppState";
import { createEmptyCanvasState } from "./drawing/drawingState";
import {
  canRedo,
  canUndo,
  commitHistoryState,
  createHistoryState,
  redoHistoryState,
  undoHistoryState,
} from "./history/historyManager";
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
    commandTraceState: createCommandTraceState(mockAppState.transcript),
    historyState: createHistoryState(createEmptyCanvasState()),
    queueState: createOperationQueueState(),
  }));

  const handleUndo = useCallback(() => {
    setDrawingSession((currentSession) => ({
      ...currentSession,
      historyState: undoHistoryState(currentSession.historyState),
    }));
  }, []);

  const handleRedo = useCallback(() => {
    setDrawingSession((currentSession) => ({
      ...currentSession,
      historyState: redoHistoryState(currentSession.historyState),
    }));
  }, []);

  const handleClear = useCallback(() => {
    setDrawingSession((currentSession) => {
      const result = executeOperationBatch(
        currentSession.historyState.present,
        currentSession.queueState,
        {
          id: `toolbar-clear:${currentSession.queueState.executedBatchIds.length}`,
          operations: [{ type: "clear_canvas" }],
        },
      );

      if (!result.executed) {
        return currentSession;
      }

      return {
        commandTraceState: currentSession.commandTraceState,
        historyState: commitHistoryState(currentSession.historyState, result.canvasState),
        queueState: result.queueState,
      };
    });
  }, []);

  useEffect(() => {
    if (!hasSkippedInitialTranscript.current) {
      hasSkippedInitialTranscript.current = true;
      return;
    }

    setDrawingSession((currentSession) => {
      const nextBatchNumber = currentSession.queueState.executedBatchIds.length + 1;
      const commandResult = parseCommand(browserSpeech.transcript, {
        canvasState: currentSession.historyState.present,
        createShapeId: (kind) => `voice-${kind}-${nextBatchNumber}`,
      });
      const commandTraceState = createCommandTraceStateFromResult(commandResult);

      if (commandResult.status !== "matched") {
        return {
          ...currentSession,
          commandTraceState,
        };
      }

      if (commandResult.intent === "undo") {
        return {
          ...currentSession,
          commandTraceState,
          historyState: undoHistoryState(currentSession.historyState),
        };
      }

      if (commandResult.intent === "redo") {
        return {
          ...currentSession,
          commandTraceState,
          historyState: redoHistoryState(currentSession.historyState),
        };
      }

      if (commandResult.operations.length === 0) {
        return {
          ...currentSession,
          commandTraceState,
        };
      }

      const result = executeOperationBatch(
        currentSession.historyState.present,
        currentSession.queueState,
        {
          id: `${commandResult.normalizedTranscript}:${currentSession.queueState.executedBatchIds.length}`,
          operations: commandResult.operations,
        },
      );

      if (!result.executed) {
        return {
          ...currentSession,
          commandTraceState,
        };
      }

      return {
        commandTraceState,
        historyState: commitHistoryState(currentSession.historyState, result.canvasState),
        queueState: result.queueState,
      };
    });
  }, [browserSpeech.transcript]);

  const canvasState = drawingSession.historyState.present;

  const appState = {
    ...mockAppState,
    ...drawingSession.commandTraceState,
    speechStatus: browserSpeech.speechStatus,
    transcript: browserSpeech.transcript,
  };

  return (
    <div className="app-shell">
      <TopBar
        canClear={canvasState.shapes.length > 0}
        canRedo={canRedo(drawingSession.historyState)}
        canUndo={canUndo(drawingSession.historyState)}
        onClear={handleClear}
        onRedo={handleRedo}
        onUndo={handleUndo}
      />
      <div className="workbench" aria-label="VoxCanvas workbench">
        <CanvasStage state={canvasState} />
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
