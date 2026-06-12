import {
  applyDrawingOperation,
  type CanvasState,
  type DrawingOperation,
} from "../drawing/drawingState";

export type OperationBatch = {
  id: string;
  operations: DrawingOperation[];
};

export type OperationQueueState = {
  executedBatchIds: string[];
  lastBatchId: string | null;
};

export type ExecuteOperationBatchResult = {
  canvasState: CanvasState;
  queueState: OperationQueueState;
  executed: boolean;
};

export function createOperationQueueState(): OperationQueueState {
  return {
    executedBatchIds: [],
    lastBatchId: null,
  };
}

export function executeOperationBatch(
  canvasState: CanvasState,
  queueState: OperationQueueState,
  batch: OperationBatch,
): ExecuteOperationBatchResult {
  if (queueState.executedBatchIds.includes(batch.id)) {
    return {
      canvasState,
      queueState,
      executed: false,
    };
  }

  const nextCanvasState = batch.operations.reduce(
    (state, operation) => applyDrawingOperation(state, operation),
    canvasState,
  );

  return {
    canvasState: nextCanvasState,
    queueState: {
      executedBatchIds: [...queueState.executedBatchIds, batch.id],
      lastBatchId: batch.id,
    },
    executed: true,
  };
}
