import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CanvasState } from "../drawing/drawingState";
import { CanvasStage } from "./CanvasStage";

describe("CanvasStage", () => {
  it("shows shape and generated image layer counts in the canvas status", () => {
    const state: CanvasState = {
      shapes: [
        {
          id: "shape-1",
          kind: "circle",
          x: 100,
          y: 100,
          width: 120,
          height: 120,
          rotation: 0,
          style: {
            fill: "#2563eb",
          },
        },
      ],
      imageLayers: [
        {
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
      ],
      selectedShapeId: "shape-1",
      selectedImageLayerId: "image-layer-1",
      lastShapeId: "shape-1",
      lastImageLayerId: "image-layer-1",
      version: 2,
    };

    render(<CanvasStage state={state} />);

    expect(screen.getByText("1 shapes / 1 image layers / v2")).toBeInTheDocument();
  });
});
