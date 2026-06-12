import type {
  DrawingOperation,
  DrawingShape,
  DrawingShapeKind,
  DrawingShapeStyle,
} from "../drawing/drawingState";

export type CommandParseStatus = "matched" | "unsupported" | "empty";

export type CommandIntent = "create_shape" | "clear_canvas" | "unknown";

export type CommandParseResult = {
  status: CommandParseStatus;
  intent: CommandIntent;
  operations: DrawingOperation[];
  operationPreview: string[];
  feedback: string[];
  normalizedTranscript: string;
};

export type ParseCommandOptions = {
  createShapeId?: (kind: DrawingShapeKind, transcript: string) => string;
};

type CommandColor = {
  label: string;
  words: string[];
  fill: string;
  stroke: string;
};

type CommandPosition = {
  label: string;
  words: string[];
  x: number;
  y: number;
};

const DEFAULT_POSITION = {
  label: "center",
  x: 480,
  y: 300,
};

const COLORS: CommandColor[] = [
  {
    label: "blue",
    words: ["蓝色", "蓝"],
    fill: "#2563eb",
    stroke: "#1d4ed8",
  },
  {
    label: "red",
    words: ["红色", "红"],
    fill: "#dc2626",
    stroke: "#991b1b",
  },
  {
    label: "green",
    words: ["绿色", "绿"],
    fill: "#16a34a",
    stroke: "#15803d",
  },
  {
    label: "yellow",
    words: ["黄色", "黄"],
    fill: "#facc15",
    stroke: "#ca8a04",
  },
  {
    label: "black",
    words: ["黑色", "黑"],
    fill: "#111827",
    stroke: "#111827",
  },
  {
    label: "white",
    words: ["白色", "白"],
    fill: "#f8fafc",
    stroke: "#64748b",
  },
];

const POSITIONS: CommandPosition[] = [
  {
    label: "top-left",
    words: ["左上角", "左上"],
    x: 180,
    y: 120,
  },
  {
    label: "top-right",
    words: ["右上角", "右上"],
    x: 700,
    y: 120,
  },
  {
    label: "bottom-left",
    words: ["左下角", "左下"],
    x: 180,
    y: 460,
  },
  {
    label: "bottom-right",
    words: ["右下角", "右下"],
    x: 700,
    y: 460,
  },
  {
    label: "center",
    words: ["中间", "中央", "中心"],
    x: 480,
    y: 300,
  },
];

export function parseCommand(
  transcript: string,
  options: ParseCommandOptions = {},
): CommandParseResult {
  const normalizedTranscript = normalizeTranscript(transcript);

  if (!normalizedTranscript) {
    return {
      status: "empty",
      intent: "unknown",
      operations: [],
      operationPreview: [],
      feedback: ["等待语音输入"],
      normalizedTranscript,
    };
  }

  if (isClearCanvasCommand(normalizedTranscript)) {
    return {
      status: "matched",
      intent: "clear_canvas",
      operations: [{ type: "clear_canvas" }],
      operationPreview: ["clear canvas"],
      feedback: ["已解析为清空画布操作"],
      normalizedTranscript,
    };
  }

  if (isObjectReferenceCommand(normalizedTranscript)) {
    return {
      status: "unsupported",
      intent: "unknown",
      operations: [],
      operationPreview: [],
      feedback: ["暂不支持对象引用指令，将在后续对象引用 PR 中接入"],
      normalizedTranscript,
    };
  }

  const shapeKind = findShapeKind(normalizedTranscript);

  if (shapeKind) {
    return createShapeResult(shapeKind, normalizedTranscript, options);
  }

  return {
    status: "unsupported",
    intent: "unknown",
    operations: [],
    operationPreview: [],
    feedback: ["暂时无法解析这条绘图指令"],
    normalizedTranscript,
  };
}

function createShapeResult(
  kind: DrawingShapeKind,
  transcript: string,
  options: ParseCommandOptions,
): CommandParseResult {
  const color = findColor(transcript);
  const position = findPosition(transcript);
  const shape = createShape(kind, transcript, color, position, options);
  const operationPreview = createOperationPreview(kind, color, position);

  return {
    status: "matched",
    intent: "create_shape",
    operations: [
      {
        type: "create_shape",
        shape,
      },
    ],
    operationPreview,
    feedback: [`已解析为创建${getShapeLabel(kind)}操作`],
    normalizedTranscript: transcript,
  };
}

function createShape(
  kind: DrawingShapeKind,
  transcript: string,
  color: CommandColor,
  position: CommandPosition | null,
  options: ParseCommandOptions,
): DrawingShape {
  const anchor = position ?? DEFAULT_POSITION;
  const size = getDefaultSize(kind);
  const style = getShapeStyle(kind, color);

  const shape: DrawingShape = {
    id: options.createShapeId?.(kind, transcript) ?? `preview-${kind}`,
    kind,
    x: getShapeX(anchor.x, size.width),
    y: getShapeY(kind, anchor.y, size.height),
    width: size.width,
    height: size.height,
    rotation: 0,
    style,
  };

  if (kind === "text") {
    shape.text = extractTextContent(transcript);
  }

  return shape;
}

function getShapeX(anchorX: number, width: number) {
  return anchorX - width / 2;
}

function getShapeY(kind: DrawingShapeKind, anchorY: number, height: number) {
  if (kind === "text") {
    return anchorY;
  }

  return anchorY - height / 2;
}

function getDefaultSize(kind: DrawingShapeKind) {
  switch (kind) {
    case "circle":
      return {
        width: 140,
        height: 140,
      };
    case "rectangle":
      return {
        width: 180,
        height: 120,
      };
    case "line":
    case "arrow":
      return {
        width: 240,
        height: 0,
      };
    case "text":
      return {
        width: 240,
        height: 36,
      };
  }
}

function getShapeStyle(kind: DrawingShapeKind, color: CommandColor): DrawingShapeStyle {
  if (kind === "line" || kind === "arrow") {
    return {
      stroke: color.stroke,
      strokeWidth: 3,
    };
  }

  return {
    fill: color.fill,
    stroke: color.stroke,
    strokeWidth: 2,
  };
}

function createOperationPreview(
  kind: DrawingShapeKind,
  color: CommandColor,
  position: CommandPosition | null,
) {
  const parts = [`add shape: ${kind}`, `color: ${color.label}`];

  if (position) {
    parts.push(`position: ${position.label}`);
  }

  return [parts.join(", ")];
}

function normalizeTranscript(transcript: string) {
  return transcript.replace(/\s+/g, " ").trim();
}

function isClearCanvasCommand(transcript: string) {
  return /清空|清除画布|清除|清屏/.test(transcript);
}

function isObjectReferenceCommand(transcript: string) {
  return /(它|刚才|这个|那个)/.test(transcript);
}

function findShapeKind(transcript: string): DrawingShapeKind | null {
  if (/圆形|圆/.test(transcript)) {
    return "circle";
  }

  if (/矩形|长方形|方形|正方形/.test(transcript)) {
    return "rectangle";
  }

  if (/箭头/.test(transcript)) {
    return "arrow";
  }

  if (/线条|直线|线/.test(transcript)) {
    return "line";
  }

  if (/文字|文本/.test(transcript)) {
    return "text";
  }

  return null;
}

function findColor(transcript: string) {
  return (
    COLORS.find((color) => color.words.some((word) => transcript.includes(word))) ??
    COLORS[0]
  );
}

function findPosition(transcript: string) {
  return POSITIONS.find((position) =>
    position.words.some((word) => transcript.includes(word)),
  ) ?? null;
}

function extractTextContent(transcript: string) {
  const match = transcript.match(/(?:添加|写|输入)?(?:一段)?(?:文字|文本)\s*(.+)$/);

  return match?.[1]?.trim() || "文本";
}

function getShapeLabel(kind: DrawingShapeKind) {
  switch (kind) {
    case "circle":
      return "圆形";
    case "rectangle":
      return "矩形";
    case "line":
      return "线条";
    case "arrow":
      return "箭头";
    case "text":
      return "文字";
  }
}
