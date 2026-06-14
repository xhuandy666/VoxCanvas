import type { CanvasState } from "../drawing/drawingState";

export const demoCanvasState: CanvasState = {
  imageLayers: [],
  shapes: [
    {
      id: "demo-circle",
      kind: "circle",
      x: 104,
      y: 88,
      width: 128,
      height: 128,
      rotation: 0,
      style: {
        fill: "#bfdbfe",
        stroke: "#1d4ed8",
        strokeWidth: 4,
      },
    },
    {
      id: "demo-rectangle",
      kind: "rectangle",
      x: 312,
      y: 104,
      width: 188,
      height: 120,
      rotation: 0,
      style: {
        fill: "#fde68a",
        stroke: "#b45309",
        strokeWidth: 4,
      },
    },
    {
      id: "demo-line",
      kind: "line",
      x: 112,
      y: 330,
      width: 260,
      height: 0,
      rotation: 0,
      style: {
        stroke: "#334155",
        strokeWidth: 5,
      },
    },
    {
      id: "demo-arrow",
      kind: "arrow",
      x: 460,
      y: 328,
      width: 220,
      height: 84,
      rotation: 0,
      style: {
        stroke: "#0f766e",
        strokeWidth: 5,
      },
    },
    {
      id: "demo-text",
      kind: "text",
      x: 118,
      y: 502,
      width: 280,
      height: 40,
      rotation: 0,
      text: "语音草图",
      style: {
        fill: "#111827",
      },
    },
  ],
  selectedImageLayerId: null,
  selectedShapeId: "demo-rectangle",
  lastImageLayerId: null,
  lastShapeId: "demo-text",
  version: 1,
};
