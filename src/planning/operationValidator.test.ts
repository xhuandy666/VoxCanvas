import { describe, expect, it } from "vitest";
import { applyDrawingOperation, createEmptyCanvasState } from "../drawing/drawingState";
import { validateDrawingOperations } from "./operationValidator";

function createCanvasWithCircle() {
  return applyDrawingOperation(createEmptyCanvasState(), {
    type: "create_shape",
    shape: {
      id: "shape-circle-1",
      kind: "circle",
      x: 410,
      y: 230,
      width: 140,
      height: 140,
      rotation: 0,
      style: {
        fill: "#2563eb",
        stroke: "#1d4ed8",
        strokeWidth: 2,
      },
    },
  });
}

describe("validateDrawingOperations", () => {
  it("accepts a valid create shape operation", () => {
    const operation = {
      type: "create_shape",
      shape: {
        id: "shape-rectangle-1",
        kind: "rectangle",
        x: 90,
        y: 60,
        width: 180,
        height: 120,
        rotation: 0,
        style: {
          fill: "#dc2626",
          stroke: "#991b1b",
          strokeWidth: 2,
        },
      },
    };

    const result = validateDrawingOperations([operation], createEmptyCanvasState());

    expect(result.valid).toBe(true);
    expect(result.operations).toEqual([operation]);
    expect(result.errors).toEqual([]);
  });

  it("accepts expanded primitive shape kinds for structured composite drawings", () => {
    const operations = [
      {
        type: "create_shape",
        shape: {
          id: "shape-triangle-1",
          kind: "triangle",
          x: 380,
          y: 120,
          width: 200,
          height: 120,
          rotation: 0,
          style: {
            fill: "#dc2626",
            stroke: "#991b1b",
            strokeWidth: 2,
          },
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "shape-diamond-1",
          kind: "diamond",
          x: 390,
          y: 260,
          width: 180,
          height: 120,
          rotation: 0,
          style: {
            fill: "#facc15",
            stroke: "#ca8a04",
            strokeWidth: 2,
          },
        },
      },
      {
        type: "create_shape",
        shape: {
          id: "shape-ellipse-1",
          kind: "ellipse",
          x: 390,
          y: 420,
          width: 180,
          height: 96,
          rotation: 0,
          style: {
            fill: "#16a34a",
            stroke: "#15803d",
            strokeWidth: 2,
          },
        },
      },
    ];

    const result = validateDrawingOperations(operations, createEmptyCanvasState());

    expect(result.valid).toBe(true);
    expect(result.operations).toEqual(operations);
    expect(result.errors).toEqual([]);
  });

  it("accepts managed generated image layer operations", () => {
    const createOperation = {
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
    };
    const updateOperation = {
      type: "update_image_layer",
      layerId: "image-layer-1",
      patch: {
        status: "succeeded",
        imageUrl: "https://example.com/generated-bird.png",
        model: "gpt-image-2",
        updatedAt: "2026-06-14T00:01:00.000Z",
      },
    };

    const result = validateDrawingOperations(
      [createOperation, updateOperation],
      createEmptyCanvasState(),
    );

    expect(result.valid).toBe(true);
    expect(result.operations).toEqual([createOperation, updateOperation]);
    expect(result.errors).toEqual([]);
  });

  it("rejects succeeded generated image layers without an image URL", () => {
    const result = validateDrawingOperations(
      [
        {
          type: "create_image_layer",
          layer: {
            id: "image-layer-1",
            prompt: "画一只蓝色的鸟",
            status: "succeeded",
            x: 170,
            y: 90,
            width: 620,
            height: 420,
            opacity: 1,
            createdAt: "2026-06-14T00:00:00.000Z",
            updatedAt: "2026-06-14T00:00:00.000Z",
          },
        },
      ],
      createEmptyCanvasState(),
    );

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason: "成功图片图层必须包含图片 URL",
      },
    ]);
  });

  it("rejects image layer updates that target missing layers", () => {
    const result = validateDrawingOperations(
      [
        {
          type: "update_image_layer",
          layerId: "missing-image-layer",
          patch: {
            status: "failed",
            errorMessage: "生成服务暂不可用",
          },
        },
      ],
      createEmptyCanvasState(),
    );

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason: "目标图片图层不存在",
      },
    ]);
  });

  it("rejects succeeded generated image layer updates without an image URL", () => {
    const withPendingLayer = applyDrawingOperation(createEmptyCanvasState(), {
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
    });

    const result = validateDrawingOperations(
      [
        {
          type: "update_image_layer",
          layerId: "image-layer-1",
          patch: {
            status: "succeeded",
            updatedAt: "2026-06-14T00:01:00.000Z",
          },
        },
      ],
      withPendingLayer,
    );

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason: "成功图片图层必须包含图片 URL",
      },
    ]);
  });

  it("rejects image layer patches that try to change identity fields", () => {
    const withPendingLayer = applyDrawingOperation(createEmptyCanvasState(), {
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
    });

    const result = validateDrawingOperations(
      [
        {
          type: "update_image_layer",
          layerId: "image-layer-1",
          patch: {
            id: "image-layer-forged",
            updatedAt: "2026-06-14T00:01:00.000Z",
          },
        },
      ],
      withPendingLayer,
    );

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason: "图片图层更新不能修改 ID 或创建时间",
      },
    ]);
  });

  it("rejects unknown operation types", () => {
    const result = validateDrawingOperations(
      [
        {
          type: "replace_dom",
          selector: "svg",
          html: "<svg />",
        },
      ],
      createEmptyCanvasState(),
    );

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason: "不支持的绘图操作类型",
      },
    ]);
  });

  it("rejects operations that reference a missing shape", () => {
    const result = validateDrawingOperations(
      [
        {
          type: "move_shape",
          shapeId: "missing-shape",
          deltaX: 60,
          deltaY: 0,
        },
      ],
      createCanvasWithCircle(),
    );

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason: "目标图形不存在",
      },
    ]);
  });

  it("rejects invalid shape geometry", () => {
    const result = validateDrawingOperations(
      [
        {
          type: "create_shape",
          shape: {
            id: "shape-bad-circle",
            kind: "circle",
            x: 100,
            y: 100,
            width: -140,
            height: 140,
            rotation: 0,
            style: {},
          },
        },
      ],
      createEmptyCanvasState(),
    );

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason: "图形尺寸必须为有效数字",
      },
    ]);
  });
});
