import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CanvasState } from "../drawing/drawingState";
import { CanvasRenderer } from "./CanvasRenderer";

const canvasState: CanvasState = {
  shapes: [
    {
      id: "circle-1",
      kind: "circle",
      x: 80,
      y: 90,
      width: 100,
      height: 100,
      rotation: 0,
      style: {
        fill: "#2563eb",
        stroke: "#1e40af",
        strokeWidth: 2,
      },
    },
    {
      id: "rect-1",
      kind: "rectangle",
      x: 260,
      y: 96,
      width: 170,
      height: 112,
      rotation: 0,
      style: {
        fill: "#facc15",
        stroke: "#92400e",
        strokeWidth: 3,
      },
    },
    {
      id: "line-1",
      kind: "line",
      x: 96,
      y: 320,
      width: 220,
      height: 0,
      rotation: 0,
      style: {
        stroke: "#111827",
        strokeWidth: 4,
      },
    },
    {
      id: "arrow-1",
      kind: "arrow",
      x: 420,
      y: 320,
      width: 180,
      height: 72,
      rotation: 0,
      style: {
        stroke: "#0f766e",
        strokeWidth: 4,
      },
    },
    {
      id: "text-1",
      kind: "text",
      x: 118,
      y: 470,
      width: 260,
      height: 36,
      rotation: 0,
      text: "VoxCanvas",
      style: {
        fill: "#111827",
      },
    },
    {
      id: "triangle-1",
      kind: "triangle",
      x: 640,
      y: 76,
      width: 180,
      height: 120,
      rotation: 0,
      style: {
        fill: "#dc2626",
        stroke: "#991b1b",
        strokeWidth: 2,
      },
    },
    {
      id: "diamond-1",
      kind: "diamond",
      x: 660,
      y: 248,
      width: 160,
      height: 120,
      rotation: 0,
      style: {
        fill: "#facc15",
        stroke: "#ca8a04",
        strokeWidth: 2,
      },
    },
    {
      id: "ellipse-1",
      kind: "ellipse",
      x: 640,
      y: 440,
      width: 180,
      height: 96,
      rotation: 0,
      style: {
        fill: "#16a34a",
        stroke: "#15803d",
        strokeWidth: 2,
      },
    },
  ],
  selectedShapeId: "rect-1",
  lastShapeId: "text-1",
  version: 8,
};

describe("CanvasRenderer", () => {
  it("renders an accessible empty canvas when there are no shapes", () => {
    render(
      <CanvasRenderer
        state={{ shapes: [], selectedShapeId: null, lastShapeId: null, version: 0 }}
      />,
    );

    expect(
      screen.getByRole("img", { name: /rendered drawing canvas/i }),
    ).toHaveAttribute("viewBox", "0 0 960 600");
    expect(screen.getByText(/canvas is ready/i)).toBeInTheDocument();
  });

  it("renders supported drawing shapes with geometry and styles", () => {
    render(<CanvasRenderer state={canvasState} />);

    const circle = screen.getByTestId("shape-circle-1").querySelector("circle");
    expect(circle).toHaveAttribute("cx", "130");
    expect(circle).toHaveAttribute("cy", "140");
    expect(circle).toHaveAttribute("r", "50");
    expect(circle).toHaveAttribute("fill", "#2563eb");
    expect(circle).toHaveAttribute("stroke", "#1e40af");

    const rectangle = screen.getByTestId("shape-rect-1").querySelector("rect");
    expect(rectangle).toHaveAttribute("x", "260");
    expect(rectangle).toHaveAttribute("y", "96");
    expect(rectangle).toHaveAttribute("width", "170");
    expect(rectangle).toHaveAttribute("height", "112");
    expect(rectangle).toHaveAttribute("fill", "#facc15");

    const line = screen.getByTestId("shape-line-1").querySelector("line");
    expect(line).toHaveAttribute("x1", "96");
    expect(line).toHaveAttribute("y1", "320");
    expect(line).toHaveAttribute("x2", "316");
    expect(line).toHaveAttribute("y2", "320");

    const arrow = screen.getByTestId("shape-arrow-1").querySelector("line");
    expect(arrow).toHaveAttribute("x1", "420");
    expect(arrow).toHaveAttribute("y1", "320");
    expect(arrow).toHaveAttribute("x2", "600");
    expect(arrow).toHaveAttribute("y2", "392");
    expect(arrow).toHaveAttribute("marker-end", "url(#canvas-arrowhead)");

    expect(screen.getByText("VoxCanvas")).toHaveAttribute("x", "118");
    expect(screen.getByText("VoxCanvas")).toHaveAttribute("y", "470");

    const triangle = screen.getByTestId("shape-triangle-1").querySelector("polygon");
    expect(triangle).toHaveAttribute("points", "730,76 820,196 640,196");
    expect(triangle).toHaveAttribute("fill", "#dc2626");

    const diamond = screen.getByTestId("shape-diamond-1").querySelector("polygon");
    expect(diamond).toHaveAttribute("points", "740,248 820,308 740,368 660,308");
    expect(diamond).toHaveAttribute("fill", "#facc15");

    const ellipse = screen.getByTestId("shape-ellipse-1").querySelector("ellipse");
    expect(ellipse).toHaveAttribute("cx", "730");
    expect(ellipse).toHaveAttribute("cy", "488");
    expect(ellipse).toHaveAttribute("rx", "90");
    expect(ellipse).toHaveAttribute("ry", "48");
    expect(ellipse).toHaveAttribute("fill", "#16a34a");
  });

  it("marks the selected shape for future object editing feedback", () => {
    render(<CanvasRenderer state={canvasState} />);

    expect(screen.getByTestId("shape-rect-1")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(screen.getByTestId("shape-circle-1")).toHaveAttribute(
      "data-selected",
      "false",
    );
  });
});
