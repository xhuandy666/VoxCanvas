import { describe, expect, it } from "vitest";
import { createEmptyCanvasState, type DrawingOperation } from "../drawing/drawingState";
import { createOperationQueueState, executeOperationBatch } from "./operationQueue";

describe("operationQueue", () => {
  it("creates a stable empty queue state", () => {
    expect(createOperationQueueState()).toEqual({
      executedBatchIds: [],
      lastBatchId: null,
    });
  });

  it("applies a batch of drawing operations in order", () => {
    const operationQueue = createOperationQueueState();
    const operations = [
      {
        type: "create_shape",
        shape: {
          id: "shape-1",
          kind: "circle",
          x: 10,
          y: 20,
          width: 80,
          height: 80,
          rotation: 0,
          style: {
            fill: "#2563eb",
          },
        },
      },
      {
        type: "move_shape",
        shapeId: "shape-1",
        deltaX: 12,
        deltaY: -4,
      },
    ] satisfies DrawingOperation[];

    const result = executeOperationBatch(createEmptyCanvasState(), operationQueue, {
      id: "batch-1",
      operations,
    });

    expect(result.canvasState.shapes).toHaveLength(1);
    expect(result.canvasState.shapes[0]).toMatchObject({
      id: "shape-1",
      x: 22,
      y: 16,
    });
    expect(result.canvasState.selectedShapeId).toBe("shape-1");
    expect(result.canvasState.lastShapeId).toBe("shape-1");
    expect(result.canvasState.version).toBe(2);
    expect(result.queueState).toEqual({
      executedBatchIds: ["batch-1"],
      lastBatchId: "batch-1",
    });
    expect(result.executed).toBe(true);
  });

  it("applies generated image layer operations through the same queue", () => {
    const result = executeOperationBatch(
      createEmptyCanvasState(),
      createOperationQueueState(),
      {
        id: "image-batch-1",
        operations: [
          {
            type: "create_image_layer",
            layer: {
              id: "image-layer-1",
              prompt: "画一只蓝色的鸟",
              status: "pending",
              x: 170,
              y: 90,
              width: 620,
              height: 420,
              opacity: 1,
              createdAt: "2026-06-14T00:00:00.000Z",
              updatedAt: "2026-06-14T00:00:00.000Z",
            },
          },
          {
            type: "update_image_layer",
            layerId: "image-layer-1",
            patch: {
              status: "succeeded",
              imageUrl: "https://example.com/generated-bird.png",
              updatedAt: "2026-06-14T00:01:00.000Z",
            },
          },
        ],
      },
    );

    expect(result.executed).toBe(true);
    expect(result.canvasState.imageLayers).toHaveLength(1);
    expect(result.canvasState.imageLayers[0]).toMatchObject({
      id: "image-layer-1",
      status: "succeeded",
      imageUrl: "https://example.com/generated-bird.png",
    });
    expect(result.canvasState.selectedImageLayerId).toBe("image-layer-1");
    expect(result.canvasState.lastImageLayerId).toBe("image-layer-1");
    expect(result.canvasState.version).toBe(2);
  });

  it("skips a batch that has already been executed", () => {
    const operationQueue = createOperationQueueState();
    const batch = {
      id: "batch-1",
      operations: [
        {
          type: "create_shape",
          shape: {
            id: "shape-1",
            kind: "rectangle",
            x: 10,
            y: 20,
            width: 120,
            height: 80,
            rotation: 0,
            style: {
              fill: "#dc2626",
            },
          },
        },
      ],
    } satisfies {
      id: string;
      operations: DrawingOperation[];
    };

    const first = executeOperationBatch(createEmptyCanvasState(), operationQueue, batch);
    const second = executeOperationBatch(first.canvasState, first.queueState, batch);

    expect(second.executed).toBe(false);
    expect(second.canvasState).toBe(first.canvasState);
    expect(second.queueState).toBe(first.queueState);
    expect(second.canvasState.shapes).toHaveLength(1);
  });
});
