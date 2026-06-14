import type {
  CanvasState,
  DrawingOperation,
  DrawingShape,
  DrawingShapeKind,
  DrawingShapeStyle,
} from "../drawing/drawingState";
import {
  CANVAS_WORLD_CENTER_X,
  CANVAS_WORLD_CENTER_Y,
  CANVAS_WORLD_HEIGHT,
  CANVAS_WORLD_WIDTH,
} from "../canvas/canvasWorkspace";
import {
  expandShapeTemplate,
  type ShapeTemplateKind,
} from "./shapeTemplateExpander";

export type CommandParseStatus = "matched" | "unsupported" | "empty";

export type CommandIntent =
  | "create_shape"
  | "create_template"
  | "update_shape"
  | "move_shape"
  | "delete_shape"
  | "clear_canvas"
  | "undo"
  | "redo"
  | "unknown";

export type CommandParseResult = {
  status: CommandParseStatus;
  intent: CommandIntent;
  operations: DrawingOperation[];
  operationPreview: string[];
  feedback: string[];
  normalizedTranscript: string;
};

export type ParseCommandOptions = {
  canvasState?: CanvasState;
  createShapeId?: (kind: DrawingShapeKind, transcript: string, index?: number) => string;
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

type ShapeMatch = {
  kind: DrawingShapeKind;
  corrected?: boolean;
};

const DEFAULT_POSITION = {
  label: "center",
  x: CANVAS_WORLD_CENTER_X,
  y: CANVAS_WORLD_CENTER_Y,
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
    x: 280,
    y: 180,
  },
  {
    label: "top-right",
    words: ["右上角", "右上"],
    x: CANVAS_WORLD_WIDTH - 280,
    y: 180,
  },
  {
    label: "bottom-left",
    words: ["左下角", "左下"],
    x: 280,
    y: CANVAS_WORLD_HEIGHT - 180,
  },
  {
    label: "bottom-right",
    words: ["右下角", "右下"],
    x: CANVAS_WORLD_WIDTH - 280,
    y: CANVAS_WORLD_HEIGHT - 180,
  },
  {
    label: "center",
    words: ["中间", "中央", "中心"],
    x: CANVAS_WORLD_CENTER_X,
    y: CANVAS_WORLD_CENTER_Y,
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

  if (isUndoCommand(normalizedTranscript)) {
    return {
      status: "matched",
      intent: "undo",
      operations: [],
      operationPreview: ["undo last operation"],
      feedback: ["已解析为撤销操作"],
      normalizedTranscript,
    };
  }

  if (isRedoCommand(normalizedTranscript)) {
    return {
      status: "matched",
      intent: "redo",
      operations: [],
      operationPreview: ["redo last undone operation"],
      feedback: ["已解析为重做操作"],
      normalizedTranscript,
    };
  }

  const templateKind = findShapeTemplateKind(normalizedTranscript);

  if (templateKind) {
    return createTemplateResult(templateKind, normalizedTranscript, options);
  }

  if (isObjectReferenceCommand(normalizedTranscript)) {
    return createObjectReferenceResult(normalizedTranscript, options);
  }

  if (isExplicitShapeEditCommand(normalizedTranscript)) {
    return createObjectReferenceResult(normalizedTranscript, options);
  }

  if (isImplicitReferenceMovementCommand(normalizedTranscript)) {
    return createObjectReferenceResult(normalizedTranscript, options);
  }

  const shapeMatch = findShapeMatch(normalizedTranscript);

  if (shapeMatch) {
    return createShapeResult(shapeMatch, normalizedTranscript, options);
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

function createTemplateResult(
  template: ShapeTemplateKind,
  transcript: string,
  options: ParseCommandOptions,
): CommandParseResult {
  const result = expandShapeTemplate(template, {
    createShapeId: options.createShapeId,
    transcript,
  });

  return {
    status: "matched",
    intent: "create_template",
    operations: result.operations,
    operationPreview: result.operationPreview,
    feedback: result.feedback,
    normalizedTranscript: transcript,
  };
}

function createShapeResult(
  shapeMatch: ShapeMatch,
  transcript: string,
  options: ParseCommandOptions,
): CommandParseResult {
  const kind = shapeMatch.kind;
  const color = findColor(transcript);
  const position = findPosition(transcript);
  const count = findShapeCount(transcript);
  const operations = Array.from({ length: count }, (_, index) => ({
    type: "create_shape" as const,
    shape: createShape(kind, transcript, color, position, options, index, count),
  }));
  const operationPreview = createOperationPreview(kind, color, position, count);

  return {
    status: "matched",
    intent: "create_shape",
    operations,
    operationPreview,
    feedback: createShapeFeedback(kind, shapeMatch),
    normalizedTranscript: transcript,
  };
}

function createShape(
  kind: DrawingShapeKind,
  transcript: string,
  color: CommandColor,
  position: CommandPosition | null,
  options: ParseCommandOptions,
  index = 0,
  count = 1,
): DrawingShape {
  const anchor = position ?? DEFAULT_POSITION;
  const size = getDefaultSize(kind);
  const style = getShapeStyle(kind, color);
  const offsetX = getRepeatedShapeOffsetX(index, count);

  const shape: DrawingShape = {
    id: options.createShapeId?.(kind, transcript, index) ?? `preview-${kind}-${index + 1}`,
    kind,
    x: getShapeX(anchor.x + offsetX, size.width),
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

function createObjectReferenceResult(
  transcript: string,
  options: ParseCommandOptions,
): CommandParseResult {
  const referenceKind = findReferencedShapeKind(transcript);
  const targetShape = findReferencedShape(options.canvasState, referenceKind);

  if (!targetShape) {
    return {
      status: "unsupported",
      intent: "unknown",
      operations: [],
      operationPreview: [],
      feedback: [createMissingReferenceFeedback(referenceKind)],
      normalizedTranscript: transcript,
    };
  }

  if (isDeleteCommand(transcript)) {
    return {
      status: "matched",
      intent: "delete_shape",
      operations: [
        {
          type: "delete_shape",
          shapeId: targetShape.id,
        },
      ],
      operationPreview: [`delete shape: ${targetShape.id}`],
      feedback: [`已解析为删除${getShapeLabel(targetShape.kind)}操作`],
      normalizedTranscript: transcript,
    };
  }

  const movement = findMovement(transcript);

  if (movement) {
    return {
      status: "matched",
      intent: "move_shape",
      operations: [
        {
          type: "move_shape",
          shapeId: targetShape.id,
          deltaX: movement.deltaX,
          deltaY: movement.deltaY,
        },
      ],
      operationPreview: [
        `move shape: ${targetShape.id}, dx: ${movement.deltaX}, dy: ${movement.deltaY}`,
      ],
      feedback: [`已解析为移动${getReferenceLabel(referenceKind)}操作`],
      normalizedTranscript: transcript,
    };
  }

  const sizeScale = findSizeScale(transcript);

  if (sizeScale) {
    return {
      status: "matched",
      intent: "update_shape",
      operations: [
        {
          type: "update_shape",
          shapeId: targetShape.id,
          patch: getScaledShapePatch(targetShape, sizeScale),
        },
      ],
      operationPreview: [`resize shape: ${targetShape.id}, scale: ${sizeScale}`],
      feedback: [`已解析为调整${getShapeLabel(targetShape.kind)}大小操作`],
      normalizedTranscript: transcript,
    };
  }

  const color = findExplicitColor(transcript);

  if (color) {
    return {
      status: "matched",
      intent: "update_shape",
      operations: [
        {
          type: "update_shape",
          shapeId: targetShape.id,
          patch: {
            style: getShapeColorPatch(targetShape.kind, color),
          },
        },
      ],
      operationPreview: [`update shape: ${targetShape.id}, color: ${color.label}`],
      feedback: [`已解析为修改${getShapeLabel(targetShape.kind)}颜色操作`],
      normalizedTranscript: transcript,
    };
  }

  return {
    status: "unsupported",
    intent: "unknown",
    operations: [],
    operationPreview: [],
    feedback: ["暂不支持这条对象编辑指令"],
    normalizedTranscript: transcript,
  };
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
    case "triangle":
      return {
        width: 180,
        height: 140,
      };
    case "diamond":
      return {
        width: 160,
        height: 120,
      };
    case "ellipse":
      return {
        width: 180,
        height: 96,
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

function getShapeColorPatch(kind: DrawingShapeKind, color: CommandColor): DrawingShapeStyle {
  if (kind === "line" || kind === "arrow") {
    return {
      stroke: color.stroke,
    };
  }

  return {
    fill: color.fill,
    stroke: color.stroke,
  };
}

function createOperationPreview(
  kind: DrawingShapeKind,
  color: CommandColor,
  position: CommandPosition | null,
  count = 1,
) {
  const parts = [`add shape: ${kind}`, `color: ${color.label}`];

  if (position) {
    parts.push(`position: ${position.label}`);
  }

  if (count > 1) {
    parts.push(`count: ${count}`);
  }

  return [parts.join(", ")];
}

function normalizeTranscript(transcript: string) {
  return transcript.replace(/\s+/g, " ").trim();
}

function isClearCanvasCommand(transcript: string) {
  return /清空|清除画布|清除|清屏|重新来|重来|从头来|回到最初状态|回到初始状态|全部清掉/.test(
    transcript,
  );
}

function isUndoCommand(transcript: string) {
  return /撤销|后退一步|退一步/.test(transcript);
}

function isRedoCommand(transcript: string) {
  return /重做|恢复一步/.test(transcript);
}

function isDeleteCommand(transcript: string) {
  return /删除|删掉|去掉/.test(transcript);
}

function isObjectReferenceCommand(transcript: string) {
  return /(它|刚才|这个|那个)/.test(transcript);
}

function isExplicitShapeEditCommand(transcript: string) {
  return (
    findShapeKind(transcript) !== null &&
    !isCreateShapeCommand(transcript) &&
    (
      isDeleteCommand(transcript) ||
      findMovement(transcript) !== null ||
      findSizeScale(transcript) !== null ||
      isExplicitColorEditCommand(transcript)
    )
  );
}

function isImplicitReferenceMovementCommand(transcript: string) {
  return (
    findMovement(transcript) !== null &&
    !findShapeKind(transcript) &&
    !/(把|将|让|使|图形|对象|形状)/.test(transcript)
  );
}

function findShapeTemplateKind(transcript: string): ShapeTemplateKind | null {
  if (/房子|房屋|小房子|小屋/.test(transcript)) {
    return "house";
  }

  if (/流程图|流程草图|处理流程|步骤图/.test(transcript)) {
    return "flowchart";
  }

  return null;
}

function isCreateShapeCommand(transcript: string) {
  return /画|创建|添加|来个|来一个|做个|做一个|摆放/.test(transcript);
}

function isExplicitColorEditCommand(transcript: string) {
  return /变成|变为|改成|改为|换成|换为/.test(transcript) && findExplicitColor(transcript) !== null;
}

function findReferencedShapeKind(transcript: string): DrawingShapeKind | null {
  return findShapeKind(transcript);
}

function findReferencedShape(
  canvasState: CanvasState | undefined,
  referenceKind: DrawingShapeKind | null,
) {
  if (!canvasState) {
    return null;
  }

  if (referenceKind) {
    return (
      [...canvasState.shapes].reverse().find((shape) => shape.kind === referenceKind) ?? null
    );
  }

  return (
    canvasState.shapes.find((shape) => shape.id === canvasState.selectedShapeId) ??
    canvasState.shapes.find((shape) => shape.id === canvasState.lastShapeId) ??
    canvasState.shapes[canvasState.shapes.length - 1] ??
    null
  );
}

function createMissingReferenceFeedback(referenceKind: DrawingShapeKind | null) {
  if (!referenceKind) {
    return "没有可引用的对象，请先创建图形";
  }

  return `没有找到可引用的${getShapeLabel(referenceKind)}`;
}

function getReferenceLabel(referenceKind: DrawingShapeKind | null) {
  if (!referenceKind) {
    return "最近对象";
  }

  return getShapeLabel(referenceKind);
}

function findMovement(transcript: string) {
  if (/向右|右边|往右/.test(transcript)) {
    return {
      deltaX: 60,
      deltaY: 0,
    };
  }

  if (/向左|左边|往左/.test(transcript)) {
    return {
      deltaX: -60,
      deltaY: 0,
    };
  }

  if (/向上|上方|往上|上移|往上一/.test(transcript)) {
    return {
      deltaX: 0,
      deltaY: -60,
    };
  }

  if (/向下|下方|往下/.test(transcript)) {
    return {
      deltaX: 0,
      deltaY: 60,
    };
  }

  return null;
}

function findSizeScale(transcript: string) {
  if (/变大|放大|大一点/.test(transcript)) {
    return 1.2;
  }

  if (/变小|缩小|小一点/.test(transcript)) {
    return 0.8;
  }

  return null;
}

function findShapeCount(transcript: string) {
  const match = transcript.match(/[画创建添加来做摆放]+([一二两三四五2-5])(?:个|只|条|块|张)?/);
  const countText = match?.[1];

  switch (countText) {
    case "二":
    case "两":
    case "2":
      return 2;
    case "三":
    case "3":
      return 3;
    case "四":
    case "4":
      return 4;
    case "五":
    case "5":
      return 5;
    default:
      return 1;
  }
}

function getRepeatedShapeOffsetX(index: number, count: number) {
  if (count <= 1) {
    return 0;
  }

  return (index - (count - 1) / 2) * 140;
}

function getScaledShapePatch(shape: DrawingShape, scale: number) {
  const nextWidth = Math.round(shape.width * scale);
  const nextHeight = Math.round(shape.height * scale);

  return {
    x: Math.round(shape.x - (nextWidth - shape.width) / 2),
    y: Math.round(shape.y - (nextHeight - shape.height) / 2),
    width: nextWidth,
    height: nextHeight,
  };
}

function findShapeKind(transcript: string): DrawingShapeKind | null {
  return findShapeMatch(transcript)?.kind ?? null;
}

function findShapeMatch(transcript: string): ShapeMatch | null {
  if (/三角形|三角/.test(transcript)) {
    return { kind: "triangle" };
  }

  if (/菱形|钻石形/.test(transcript)) {
    return { kind: "diamond" };
  }

  if (/椭圆形|椭圆/.test(transcript)) {
    return { kind: "ellipse" };
  }

  if (/圆形|圆/.test(transcript)) {
    return { kind: "circle" };
  }

  if (isCircleHomophoneCommand(transcript)) {
    return { kind: "circle", corrected: true };
  }

  if (/矩形|长方形|方形|正方形/.test(transcript)) {
    return { kind: "rectangle" };
  }

  if (/箭头/.test(transcript)) {
    return { kind: "arrow" };
  }

  if (/线条|直线|线/.test(transcript)) {
    return { kind: "line" };
  }

  if (/文字|文本/.test(transcript)) {
    return { kind: "text" };
  }

  return null;
}

function isCircleHomophoneCommand(transcript: string) {
  if (/花园|公园|园林|校园|幼儿园/.test(transcript)) {
    return false;
  }

  return /(?:画|创建|添加|来个|来一个|做个|做一个|摆放).{0,10}园(?:形)?/.test(
    transcript,
  );
}

function createShapeFeedback(kind: DrawingShapeKind, shapeMatch: ShapeMatch) {
  const feedback = [`已解析为创建${getShapeLabel(kind)}操作`];

  if (shapeMatch.corrected && kind === "circle") {
    feedback.unshift("已将“园”理解为圆形");
  }

  return feedback;
}

function findColor(transcript: string) {
  return (
    COLORS.find((color) => color.words.some((word) => transcript.includes(word))) ??
    COLORS[0]
  );
}

function findExplicitColor(transcript: string) {
  return COLORS.find((color) => color.words.some((word) => transcript.includes(word))) ?? null;
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
    case "triangle":
      return "三角形";
    case "diamond":
      return "菱形";
    case "ellipse":
      return "椭圆";
    case "line":
      return "线条";
    case "arrow":
      return "箭头";
    case "text":
      return "文字";
  }
}
