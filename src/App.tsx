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
import {
  applyDrawingOperation,
  createEmptyCanvasState,
  type CanvasState,
  type UpdateImageLayerOperation,
} from "./drawing/drawingState";
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
import {
  routeSemanticPlan,
  type QueuedImageGenerationRequest,
} from "./planning/intentRouter";
import { createRemoteSemanticPlanner } from "./planning/semanticPlannerClient";
import { createRemoteImageGenerationClient } from "./images/imageGenerationClient";
import { useBrowserSpeech } from "./speech/useBrowserSpeech";
import type { RemoteImageGenerationResult } from "./images/imageGenerationClient";

const COMMAND_TRACE_VISIBLE_MS = 3000;

type DrawingSession = {
  commandTraceState: CommandTraceState;
  historyState: HistoryState<CanvasState>;
  queuedImageRequest?: QueuedImageGenerationRequest;
  queueState: OperationQueueState;
};

export default function App() {
  const browserSpeech = useBrowserSpeech({
    initialTranscript: mockAppState.transcript,
    language: mockAppState.language,
  });
  const hasSkippedInitialTranscript = useRef(false);
  const shouldPreserveTraceOnEmptyTranscript = useRef(false);
  const [drawingSession, setDrawingSession] = useState(() => ({
    commandTraceState: createCommandTraceState(mockAppState.transcript),
    historyState: createHistoryState(createEmptyCanvasState()),
    queueState: createOperationQueueState(),
  }));
  const drawingSessionRef = useRef<DrawingSession>(drawingSession);
  const imageGenerationClientRef = useRef(createRemoteImageGenerationClient());
  drawingSessionRef.current = drawingSession;

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
        queuedImageRequest: undefined,
        queueState: result.queueState,
      };
    });
  }, []);

  const completeQueuedImageGeneration = useCallback(
    async (queuedImageRequest: QueuedImageGenerationRequest) => {
      const result = await imageGenerationClientRef.current({
        canvasState: drawingSessionRef.current.historyState.present,
        editInstruction: queuedImageRequest.editInstruction,
        layer: queuedImageRequest.layer,
        mode: queuedImageRequest.mode,
        sourceLayer: queuedImageRequest.sourceLayer,
      });
      const operation: UpdateImageLayerOperation = {
        type: "update_image_layer",
        layerId: queuedImageRequest.layer.id,
        patch: createImageLayerCompletionPatch(result),
      };

      setDrawingSession((latestSession) => {
        const nextSession = applyImageLayerCompletionToSession(
          latestSession,
          operation,
        );
        drawingSessionRef.current = nextSession;

        return nextSession;
      });
    },
    [],
  );

  useEffect(() => {
    if (!hasSkippedInitialTranscript.current) {
      hasSkippedInitialTranscript.current = true;
      return;
    }

    const transcript = browserSpeech.transcript;
    let cancelled = false;
    const currentSession = drawingSessionRef.current;

    if (!transcript.trim()) {
      setDrawingSession((latestSession) => {
        if (shouldPreserveTraceOnEmptyTranscript.current) {
          shouldPreserveTraceOnEmptyTranscript.current = false;
          return latestSession;
        }

        const nextSession = {
          ...latestSession,
          commandTraceState: createCommandTraceState(transcript),
        };

        drawingSessionRef.current = nextSession;

        return nextSession;
      });

      return () => {
        cancelled = true;
      };
    }

    if (!browserSpeech.isTranscriptFinal) {
      return () => {
        cancelled = true;
      };
    }

    const nextBatchNumber = currentSession.queueState.executedBatchIds.length + 1;
    const semanticPlan = createSemanticPlan(transcript, {
      canvasState: currentSession.historyState.present,
      createShapeId: (kind, _transcript, index) =>
        createVoiceShapeId(kind, nextBatchNumber, index),
    });
    const usesRemotePlanner =
      semanticPlan.source === "mock_semantic_planner" &&
      semanticPlan.status === "unsupported";

    const nextSession = applySemanticPlanToSession(currentSession, semanticPlan, transcript);
    drawingSessionRef.current = nextSession;
    setDrawingSession(nextSession);
    if (nextSession.queuedImageRequest) {
      void completeQueuedImageGeneration(nextSession.queuedImageRequest);
    }

    if (usesRemotePlanner) {
      void createSemanticPlanAsync(transcript, {
        canvasState: currentSession.historyState.present,
        createShapeId: (kind, _transcript, index) =>
          createVoiceShapeId(kind, nextBatchNumber, index),
        semanticPlanner: createRemoteSemanticPlanner(),
        semanticPlannerSource: "llm_semantic_planner",
      }).then((remoteSemanticPlan) => {
        if (cancelled) {
          return;
        }

        setDrawingSession((latestSession) => {
          const remoteSession = applySemanticPlanToSession(
            latestSession,
            remoteSemanticPlan,
            transcript,
          );
          drawingSessionRef.current = remoteSession;

          if (remoteSession.queuedImageRequest) {
            void completeQueuedImageGeneration(remoteSession.queuedImageRequest);
          }

          return remoteSession;
        });

        shouldPreserveTraceOnEmptyTranscript.current = true;
        browserSpeech.clearTranscript();
      });
    }

    if (transcript.trim() && browserSpeech.isTranscriptFinal && !usesRemotePlanner) {
      shouldPreserveTraceOnEmptyTranscript.current = true;
      browserSpeech.clearTranscript();
    }

    return () => {
      cancelled = true;
    };
  }, [
    browserSpeech.clearTranscript,
    browserSpeech.transcriptRevision,
    completeQueuedImageGeneration,
  ]);

  useEffect(() => {
    const commandTraceState = drawingSession.commandTraceState;

    if (!shouldAutoClearCommandTrace(commandTraceState)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDrawingSession((currentSession) => {
        if (currentSession.commandTraceState !== commandTraceState) {
          return currentSession;
        }

        const nextSession = {
          ...currentSession,
          commandTraceState: createCommandTraceState(""),
        };

        drawingSessionRef.current = nextSession;

        return nextSession;
      });
    }, COMMAND_TRACE_VISIBLE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [drawingSession.commandTraceState]);

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
        canClear={canvasState.shapes.length > 0 || canvasState.imageLayers.length > 0}
        canRedo={canRedo(drawingSession.historyState)}
        canUndo={canUndo(drawingSession.historyState)}
        onClear={handleClear}
        onRedo={handleRedo}
        onUndo={handleUndo}
      />
      <div className="workbench" aria-label="VoxCanvas workbench">
        <CanvasStage state={canvasState} />
        <div className="floating-workbench-panels" aria-label="Voice and trace panels">
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
    </div>
  );
}

function createVoiceShapeId(kind: string, batchNumber: number, index = 0) {
  const baseId = `voice-${kind}-${batchNumber}`;

  return index === 0 ? baseId : `${baseId}-${index + 1}`;
}

function shouldAutoClearCommandTrace(commandTraceState: CommandTraceState) {
  return (
    commandTraceState.recognizedText.trim().length > 0 ||
    commandTraceState.parsedIntent !== "unknown" ||
    commandTraceState.operationPreview.some((entry) => entry !== "no operation preview") ||
    commandTraceState.feedbackLog.some((entry) => entry !== "等待语音输入")
  );
}

function applySemanticPlanToSession(
  currentSession: DrawingSession,
  semanticPlan: SemanticPlanResult,
  recognizedText = semanticPlan.normalizedTranscript,
): DrawingSession {
  const routedIntent = routeSemanticPlan(semanticPlan, {
    canvasState: currentSession.historyState.present,
    createImageLayerId: () =>
      `voice-image-${currentSession.queueState.executedBatchIds.length + 1}`,
  });
  const commandTraceState = createCommandTraceStateFromSemanticPlan({
    ...semanticPlan,
    feedback: routedIntent.feedback,
    operations: routedIntent.operations,
    operationPreview: routedIntent.operationPreview,
  }, recognizedText);

  if (semanticPlan.status !== "matched") {
    return {
      ...currentSession,
      commandTraceState,
      queuedImageRequest: undefined,
    };
  }

  if (semanticPlan.intent === "undo") {
    return {
      ...currentSession,
      commandTraceState,
      historyState: undoHistoryState(currentSession.historyState),
      queuedImageRequest: undefined,
    };
  }

  if (semanticPlan.intent === "redo") {
    return {
      ...currentSession,
      commandTraceState,
      historyState: redoHistoryState(currentSession.historyState),
      queuedImageRequest: undefined,
    };
  }

  if (routedIntent.operations.length === 0) {
    return {
      ...currentSession,
      commandTraceState,
      queuedImageRequest: undefined,
    };
  }

  const result = executeOperationBatch(
    currentSession.historyState.present,
    currentSession.queueState,
    {
      id: `${semanticPlan.normalizedTranscript}:${currentSession.queueState.executedBatchIds.length}`,
      operations: routedIntent.operations,
    },
  );

  if (!result.executed) {
    return {
      ...currentSession,
      commandTraceState,
      queuedImageRequest: undefined,
    };
  }

  return {
    commandTraceState,
    historyState: commitHistoryState(currentSession.historyState, result.canvasState),
    queuedImageRequest: routedIntent.queuedImageRequest,
    queueState: result.queueState,
  };
}

function applyImageLayerCompletionToSession(
  session: DrawingSession,
  operation: UpdateImageLayerOperation,
): DrawingSession {
  const updater = (state: CanvasState) => applyDrawingOperation(state, operation);

  return {
    ...session,
    historyState: {
      past: session.historyState.past.map(updater),
      present: updater(session.historyState.present),
      future: session.historyState.future.map(updater),
    },
    queuedImageRequest:
      session.queuedImageRequest?.layer.id === operation.layerId
        ? undefined
        : session.queuedImageRequest,
  };
}

function createImageLayerCompletionPatch(
  result: RemoteImageGenerationResult,
): UpdateImageLayerOperation["patch"] {
  const updatedAt = new Date().toISOString();

  if (result.status === "succeeded" && result.imageUrl) {
    return {
      status: "succeeded",
      imageUrl: result.imageUrl,
      model: result.model,
      revisedPrompt: result.revisedPrompt,
      errorMessage: undefined,
      updatedAt,
    };
  }

  return {
    status: "failed",
    errorMessage: result.errorMessage ?? "图片生成服务未返回可用结果",
    updatedAt,
  };
}
