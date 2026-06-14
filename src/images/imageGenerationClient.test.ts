import { describe, expect, it, vi } from "vitest";
import { createEmptyCanvasState, type GeneratedImageLayer } from "../drawing/drawingState";
import { createRemoteImageGenerationClient } from "./imageGenerationClient";

const pendingLayer: GeneratedImageLayer = {
  id: "voice-image-1",
  prompt: "画一只蓝色的鸟",
  status: "pending",
  x: 170,
  y: 90,
  width: 620,
  height: 420,
  opacity: 1,
  createdAt: "2026-06-14T00:00:00.000Z",
  updatedAt: "2026-06-14T00:00:00.000Z",
};

describe("createRemoteImageGenerationClient", () => {
  it("posts image generation requests to the local endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "succeeded",
        imageUrl: "https://example.com/generated.png",
        model: "wan2.7-image-pro",
      }),
    });
    const client = createRemoteImageGenerationClient({ fetchImpl });

    const result = await client({
      canvasState: createEmptyCanvasState(),
      layer: pendingLayer,
      mode: "text_to_image",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/image-generation",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({
      layer: pendingLayer,
      mode: "text_to_image",
    });
    expect(result).toEqual({
      status: "succeeded",
      imageUrl: "https://example.com/generated.png",
      model: "wan2.7-image-pro",
    });
  });

  it("returns a failed result for malformed endpoint success payloads", async () => {
    const client = createRemoteImageGenerationClient({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "succeeded",
        }),
      }),
    });

    await expect(
      client({
        canvasState: createEmptyCanvasState(),
        layer: pendingLayer,
        mode: "text_to_image",
      }),
    ).resolves.toEqual({
      status: "failed",
      errorMessage: "图片生成端点返回 HTTP 错误",
    });
  });
});
