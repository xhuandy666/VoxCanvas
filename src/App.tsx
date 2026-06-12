import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasStage } from "./components/CanvasStage";
import { CommandTracePanel } from "./components/CommandTracePanel";
import { TopBar } from "./components/TopBar";
import { VoicePanel } from "./components/VoicePanel";
import {
  createCommandTraceState,
  createCommandTraceStateFromSemanticPlan,
  type CommandTraceState,
} from "./commands/commandTrace";
import { mockAppState } from "./data/mockAppState";
import { createEmptyCanvasState, type CanvasState } from "./drawing/drawingState";
import {
  canRedo,
  canUndo,
  commitHistoryState,
  createHistoryState,
  type HistoryState,
  redoHistoryState,
  undoHistoryState,
} from "./history/historyManager";
import {
  createOperationQueueState,
  executeOperationBatch,
  type OperationQueueState,
} from "./operations/operationQueue";
import {
  createSemanticPlan,
  createSemanticPlanAsync,
  type SemanticPlanResult,
} from "./planning/semanticPlanner";
import { createRemoteSemanticPlanner } from "./planning/semanticPlannerClient";
import { useBrowserSpeech } from "./speech/useBrowserSpeech";

type DrawingSession = {
  commandTraceState: CommandTraceState;
  historyState: HistoryState<CanvasState>;
  queueState: OperationQueueState;
};

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

    const transcript = browserSpeech.transcript;
    let cancelled = false;

    setDrawingSession((currentSession) => {
      if (!transcript.trim()) {
        return {
          ...currentSession,
          commandTraceState: createCommandTraceState(transcript),
        };
      }

      const nextBatchNumber = currentSession.queueState.executedBatchIds.length + 1;
      const semanticPlan = createSemanticPlan(transcript, {
        canvasState: currentSession.historyState.present,
        createShapeId: (kind) => `voice-${kind}-${nextBatchNumber}`,
      });

      if (
        semanticPlan.source === "mock_semantic_planner" &&
        semanticPlan.status === "unsupported"
      ) {
        void createSemanticPlanAsync(transcript, {
          canvasState: currentSession.historyState.present,
          createShapeId: (kind) => `voice-${kind}-${nextBatchNumber}`,
          semanticPlanner: createRemoteSemanticPlanner(),
          semanticPlannerSource: "llm_semantic_planner",
        }).then((remoteSemanticPlan) => {
          if (cancelled) {
            return;
          }

          setDrawingSession((latestSession) =>
            applySemanticPlanToSession(latestSession, remoteSemanticPlan),
          );
        });
      }

      return applySemanticPlanToSession(currentSession, semanticPlan);
    });

    return () => {
      cancelled = true;
    };
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

function applySemanticPlanToSession(
  currentSession: DrawingSession,
  semanticPlan: SemanticPlanResult,
): DrawingSession {
  const commandTraceState = createCommandTraceStateFromSemanticPlan(semanticPlan);

  if (semanticPlan.status !== "matched") {
    return {
      ...currentSession,
      commandTraceState,
    };
  }

  if (semanticPlan.intent === "undo") {
    return {
      ...currentSession,
      commandTraceState,
      historyState: undoHistoryState(currentSession.historyState),
    };
  }

  if (semanticPlan.intent === "redo") {
    return {
      ...currentSession,
      commandTraceState,
      historyState: redoHistoryState(currentSession.historyState),
    };
  }

  if (semanticPlan.operations.length === 0) {
    return {
      ...currentSession,
      commandTraceState,
    };
  }

  const result = executeOperationBatch(
    currentSession.historyState.present,
    currentSession.queueState,
    {
      id: `${semanticPlan.normalizedTranscript}:${currentSession.queueState.executedBatchIds.length}`,
      operations: semanticPlan.operations,
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
}
