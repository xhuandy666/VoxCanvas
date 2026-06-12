import type {
  DrawingOperation,
  DrawingShape,
  DrawingShapeKind,
  DrawingShapeStyle,
} from "../drawing/drawingState";

export type ShapeTemplateKind = "house" | "flowchart";

export type ShapeTemplateExpandOptions = {
  createShapeId?: (kind: DrawingShapeKind, transcript: string) => string;
  transcript: string;
};

export type ShapeTemplateExpandResult = {
  template: ShapeTemplateKind;
  operations: DrawingOperation[];
  operationPreview: string[];
  feedback: string[];
};

type TemplateShape = Omit<DrawingShape, "id"> & {
  role: string;
};

const HOUSE_SHAPES: TemplateShape[] = [
  {
    role: "wall",
    kind: "rectangle",
    x: 360,
    y: 260,
    width: 240,
    height: 190,
    rotation: 0,
    style: {
      fill: "#fde68a",
      stroke: "#b45309",
      strokeWidth: 2,
    },
  },
  {
    role: "roof",
    kind: "triangle",
    x: 330,
    y: 145,
    width: 300,
    height: 150,
    rotation: 0,
    style: {
      fill: "#ef4444",
      stroke: "#991b1b",
      strokeWidth: 3,
    },
  },
  {
    role: "window-left",
    kind: "rectangle",
    x: 395,
    y: 305,
    width: 54,
    height: 52,
    rotation: 0,
    style: {
      fill: "#bfdbfe",
      stroke: "#2563eb",
      strokeWidth: 2,
    },
  },
  {
    role: "window-right",
    kind: "rectangle",
    x: 511,
    y: 305,
    width: 54,
    height: 52,
    rotation: 0,
    style: {
      fill: "#bfdbfe",
      stroke: "#2563eb",
      strokeWidth: 2,
    },
  },
  {
    role: "door",
    kind: "rectangle",
    x: 455,
    y: 365,
    width: 70,
    height: 85,
    rotation: 0,
    style: {
      fill: "#92400e",
      stroke: "#78350f",
      strokeWidth: 2,
    },
  },
];

const FLOWCHART_SHAPES: TemplateShape[] = [
  {
    role: "start",
    kind: "ellipse",
    x: 390,
    y: 70,
    width: 180,
    height: 72,
    rotation: 0,
    style: {
      fill: "#bbf7d0",
      stroke: "#15803d",
      strokeWidth: 2,
    },
  },
  {
    role: "start-to-decision",
    kind: "arrow",
    x: 480,
    y: 155,
    width: 1,
    height: 58,
    rotation: 0,
    style: arrowStyle(),
  },
  {
    role: "decision",
    kind: "diamond",
    x: 390,
    y: 225,
    width: 180,
    height: 120,
    rotation: 0,
    style: {
      fill: "#fef3c7",
      stroke: "#ca8a04",
      strokeWidth: 2,
    },
  },
  {
    role: "decision-to-process",
    kind: "arrow",
    x: 480,
    y: 355,
    width: 1,
    height: 62,
    rotation: 0,
    style: arrowStyle(),
  },
  {
    role: "process",
    kind: "rectangle",
    x: 380,
    y: 430,
    width: 200,
    height: 100,
    rotation: 0,
    style: {
      fill: "#dbeafe",
      stroke: "#2563eb",
      strokeWidth: 2,
    },
  },
  {
    role: "start-label",
    kind: "text",
    x: 442,
    y: 116,
    width: 80,
    height: 22,
    rotation: 0,
    text: "开始",
    style: textStyle("#14532d"),
  },
  {
    role: "decision-label",
    kind: "text",
    x: 442,
    y: 292,
    width: 80,
    height: 22,
    rotation: 0,
    text: "判断",
    style: textStyle("#713f12"),
  },
  {
    role: "process-label",
    kind: "text",
    x: 442,
    y: 486,
    width: 80,
    height: 22,
    rotation: 0,
    text: "处理",
    style: textStyle("#1e3a8a"),
  },
];

export function expandShapeTemplate(
  template: ShapeTemplateKind,
  options: ShapeTemplateExpandOptions,
): ShapeTemplateExpandResult {
  switch (template) {
    case "house":
      return createTemplateResult({
        feedback: "已展开房子草图模板",
        operationPreview:
          "expand template: house, shapes: wall, roof, window-left, window-right, door",
        options,
        shapes: HOUSE_SHAPES,
        template,
      });
    case "flowchart":
      return createTemplateResult({
        feedback: "已展开流程图模板",
        operationPreview: "expand template: flowchart, shapes: start, decision, process, labels",
        options,
        shapes: FLOWCHART_SHAPES,
        template,
      });
  }
}

function createTemplateResult({
  feedback,
  operationPreview,
  options,
  shapes,
  template,
}: {
  feedback: string;
  operationPreview: string;
  options: ShapeTemplateExpandOptions;
  shapes: TemplateShape[];
  template: ShapeTemplateKind;
}): ShapeTemplateExpandResult {
  return {
    template,
    operations: shapes.map((shape, index) => ({
      type: "create_shape",
      shape: createTemplateShape(shape, template, index, options),
    })),
    operationPreview: [operationPreview],
    feedback: [feedback],
  };
}

function createTemplateShape(
  { role, style, ...shape }: TemplateShape,
  template: ShapeTemplateKind,
  index: number,
  options: ShapeTemplateExpandOptions,
): DrawingShape {
  const baseId =
    options.createShapeId?.(shape.kind, options.transcript) ??
    `template-${template}-${shape.kind}-${index + 1}`;

  return {
    ...shape,
    id: `${baseId}-${role}`,
    style: {
      ...style,
    },
  };
}

function arrowStyle(): DrawingShapeStyle {
  return {
    stroke: "#334155",
    strokeWidth: 3,
  };
}

function textStyle(fill: string): DrawingShapeStyle {
  return {
    fill,
    stroke: fill,
    strokeWidth: 0,
  };
}
