import type {
  CanvasState,
  DrawingOperation,
  DrawingShape,
  DrawingShapeKind,
  DrawingShapeStyle,
  GeneratedImageLayer,
  GeneratedImageLayerStatus,
  UpdateImageLayerOperation,
  UpdateShapeOperation,
} from "../drawing/drawingState";

export type OperationValidationError = {
  index: number;
  reason: string;
};

export type OperationValidationResult = {
  valid: boolean;
  operations: DrawingOperation[];
  errors: OperationValidationError[];
};

const SHAPE_KINDS: DrawingShapeKind[] = [
  "circle",
  "rectangle",
  "line",
  "arrow",
  "text",
  "triangle",
  "diamond",
  "ellipse",
];

export function validateDrawingOperations(
  rawOperations: unknown[],
  canvasState: CanvasState,
): OperationValidationResult {
  const acceptedOperations: DrawingOperation[] = [];
  const errors: OperationValidationError[] = [];
  const knownShapeIds = new Set(canvasState.shapes.map((shape) => shape.id));
  const knownImageLayerIds = new Set(canvasState.imageLayers.map((layer) => layer.id));

  rawOperations.forEach((rawOperation, index) => {
    const validation = validateDrawingOperation(
      rawOperation,
      knownShapeIds,
      knownImageLayerIds,
    );

    if (!validation.valid) {
      errors.push({
        index,
        reason: validation.reason,
      });
      return;
    }

    acceptedOperations.push(validation.operation);

    if (validation.operation.type === "create_shape") {
      knownShapeIds.add(validation.operation.shape.id);
    }

    if (validation.operation.type === "delete_shape") {
      knownShapeIds.delete(validation.operation.shapeId);
    }

    if (validation.operation.type === "create_image_layer") {
      knownImageLayerIds.add(validation.operation.layer.id);
    }

    if (validation.operation.type === "delete_image_layer") {
      knownImageLayerIds.delete(validation.operation.layerId);
    }
  });

  if (errors.length > 0) {
    return {
      valid: false,
      operations: [],
      errors,
    };
  }

  return {
    valid: true,
    operations: acceptedOperations,
    errors,
  };
}

type SingleOperationValidationResult =
  | {
      valid: true;
      operation: DrawingOperation;
    }
  | {
      valid: false;
      reason: string;
    };

function validateDrawingOperation(
  rawOperation: unknown,
  knownShapeIds: Set<string>,
  knownImageLayerIds: Set<string>,
): SingleOperationValidationResult {
  if (!isRecord(rawOperation) || typeof rawOperation.type !== "string") {
    return {
      valid: false,
      reason: "绘图操作必须包含类型",
    };
  }

  switch (rawOperation.type) {
    case "create_shape":
      return validateCreateShapeOperation(rawOperation, knownShapeIds);
    case "update_shape":
      return validateUpdateShapeOperation(rawOperation, knownShapeIds);
    case "move_shape":
      return validateMoveShapeOperation(rawOperation, knownShapeIds);
    case "delete_shape":
      return validateDeleteShapeOperation(rawOperation, knownShapeIds);
    case "clear_canvas":
      return {
        valid: true,
        operation: {
          type: "clear_canvas",
        },
      };
    case "create_image_layer":
      return validateCreateImageLayerOperation(rawOperation, knownImageLayerIds);
    case "update_image_layer":
      return validateUpdateImageLayerOperation(rawOperation, knownImageLayerIds);
    case "delete_image_layer":
      return validateDeleteImageLayerOperation(rawOperation, knownImageLayerIds);
    default:
      return {
        valid: false,
        reason: "不支持的绘图操作类型",
      };
  }
}

function validateCreateImageLayerOperation(
  rawOperation: Record<string, unknown>,
  knownImageLayerIds: Set<string>,
): SingleOperationValidationResult {
  if (!isGeneratedImageLayer(rawOperation.layer)) {
    return {
      valid: false,
      reason: getImageLayerValidationError(rawOperation.layer),
    };
  }

  if (knownImageLayerIds.has(rawOperation.layer.id)) {
    return {
      valid: false,
      reason: "图片图层 ID 已存在",
    };
  }

  return {
    valid: true,
    operation: {
      type: "create_image_layer",
      layer: rawOperation.layer,
    },
  };
}

function validateUpdateImageLayerOperation(
  rawOperation: Record<string, unknown>,
  knownImageLayerIds: Set<string>,
): SingleOperationValidationResult {
  if (!isKnownImageLayerId(rawOperation.layerId, knownImageLayerIds)) {
    return {
      valid: false,
      reason: "目标图片图层不存在",
    };
  }

  if (!isImageLayerPatch(rawOperation.patch)) {
    return {
      valid: false,
      reason: getImageLayerPatchValidationError(rawOperation.patch),
    };
  }

  return {
    valid: true,
    operation: {
      type: "update_image_layer",
      layerId: rawOperation.layerId,
      patch: rawOperation.patch,
    },
  };
}

function validateDeleteImageLayerOperation(
  rawOperation: Record<string, unknown>,
  knownImageLayerIds: Set<string>,
): SingleOperationValidationResult {
  if (!isKnownImageLayerId(rawOperation.layerId, knownImageLayerIds)) {
    return {
      valid: false,
      reason: "目标图片图层不存在",
    };
  }

  return {
    valid: true,
    operation: {
      type: "delete_image_layer",
      layerId: rawOperation.layerId,
    },
  };
}

function validateCreateShapeOperation(
  rawOperation: Record<string, unknown>,
  knownShapeIds: Set<string>,
): SingleOperationValidationResult {
  if (!isShape(rawOperation.shape)) {
    return {
      valid: false,
      reason: getShapeValidationError(rawOperation.shape),
    };
  }

  if (knownShapeIds.has(rawOperation.shape.id)) {
    return {
      valid: false,
      reason: "图形 ID 已存在",
    };
  }

  return {
    valid: true,
    operation: {
      type: "create_shape",
      shape: rawOperation.shape,
    },
  };
}

function validateUpdateShapeOperation(
  rawOperation: Record<string, unknown>,
  knownShapeIds: Set<string>,
): SingleOperationValidationResult {
  if (!isKnownShapeId(rawOperation.shapeId, knownShapeIds)) {
    return {
      valid: false,
      reason: "目标图形不存在",
    };
  }

  if (!isUpdatePatch(rawOperation.patch)) {
    return {
      valid: false,
      reason: "图形更新补丁不合法",
    };
  }

  return {
    valid: true,
    operation: {
      type: "update_shape",
      shapeId: rawOperation.shapeId,
      patch: rawOperation.patch,
    },
  };
}

function validateMoveShapeOperation(
  rawOperation: Record<string, unknown>,
  knownShapeIds: Set<string>,
): SingleOperationValidationResult {
  if (!isKnownShapeId(rawOperation.shapeId, knownShapeIds)) {
    return {
      valid: false,
      reason: "目标图形不存在",
    };
  }

  if (!isFiniteNumber(rawOperation.deltaX) || !isFiniteNumber(rawOperation.deltaY)) {
    return {
      valid: false,
      reason: "移动距离必须为有效数字",
    };
  }

  return {
    valid: true,
    operation: {
      type: "move_shape",
      shapeId: rawOperation.shapeId,
      deltaX: rawOperation.deltaX,
      deltaY: rawOperation.deltaY,
    },
  };
}

function validateDeleteShapeOperation(
  rawOperation: Record<string, unknown>,
  knownShapeIds: Set<string>,
): SingleOperationValidationResult {
  if (!isKnownShapeId(rawOperation.shapeId, knownShapeIds)) {
    return {
      valid: false,
      reason: "目标图形不存在",
    };
  }

  return {
    valid: true,
    operation: {
      type: "delete_shape",
      shapeId: rawOperation.shapeId,
    },
  };
}

function isShape(value: unknown): value is DrawingShape {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isShapeKind(value.kind) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isValidDimension(value.width, "width") &&
    isValidDimension(value.height, "height") &&
    isFiniteNumber(value.rotation) &&
    (value.text === undefined || typeof value.text === "string") &&
    isShapeStyle(value.style)
  );
}

function getShapeValidationError(value: unknown) {
  if (!isRecord(value)) {
    return "图形必须是对象";
  }

  if (!isNonEmptyString(value.id)) {
    return "图形 ID 不能为空";
  }

  if (!isShapeKind(value.kind)) {
    return "不支持的图形类型";
  }

  if (
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.rotation)
  ) {
    return "图形坐标必须为有效数字";
  }

  if (!isValidDimension(value.width, "width") || !isValidDimension(value.height, "height")) {
    return "图形尺寸必须为有效数字";
  }

  if (!isShapeStyle(value.style)) {
    return "图形样式不合法";
  }

  return "图形不合法";
}

function isGeneratedImageLayer(value: unknown): value is GeneratedImageLayer {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.prompt) &&
    isImageLayerStatus(value.status) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isValidDimension(value.width, "width") &&
    isValidDimension(value.height, "height") &&
    isOpacity(value.opacity) &&
    (value.imageUrl === undefined || isNonEmptyString(value.imageUrl)) &&
    (value.model === undefined || isNonEmptyString(value.model)) &&
    (value.revisedPrompt === undefined || typeof value.revisedPrompt === "string") &&
    (value.errorMessage === undefined || typeof value.errorMessage === "string") &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.updatedAt) &&
    (value.status !== "succeeded" || isNonEmptyString(value.imageUrl))
  );
}

function getImageLayerValidationError(value: unknown) {
  if (!isRecord(value)) {
    return "图片图层必须是对象";
  }

  if (!isNonEmptyString(value.id)) {
    return "图片图层 ID 不能为空";
  }

  if (!isNonEmptyString(value.prompt)) {
    return "图片图层 prompt 不能为空";
  }

  if (!isImageLayerStatus(value.status)) {
    return "图片图层状态不合法";
  }

  if (
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isValidDimension(value.width, "width") ||
    !isValidDimension(value.height, "height")
  ) {
    return "图片图层尺寸必须为有效数字";
  }

  if (!isOpacity(value.opacity)) {
    return "图片图层透明度不合法";
  }

  if (value.status === "succeeded" && !isNonEmptyString(value.imageUrl)) {
    return "成功图片图层必须包含图片 URL";
  }

  if (!isNonEmptyString(value.createdAt) || !isNonEmptyString(value.updatedAt)) {
    return "图片图层时间戳不能为空";
  }

  return "图片图层不合法";
}

function isImageLayerPatch(value: unknown): value is UpdateImageLayerOperation["patch"] {
  if (!isRecord(value)) {
    return false;
  }

  if (value.id !== undefined || value.createdAt !== undefined) {
    return false;
  }

  if (value.prompt !== undefined && !isNonEmptyString(value.prompt)) {
    return false;
  }

  if (value.status !== undefined && !isImageLayerStatus(value.status)) {
    return false;
  }

  if (value.x !== undefined && !isFiniteNumber(value.x)) {
    return false;
  }

  if (value.y !== undefined && !isFiniteNumber(value.y)) {
    return false;
  }

  if (value.width !== undefined && !isValidDimension(value.width, "width")) {
    return false;
  }

  if (value.height !== undefined && !isValidDimension(value.height, "height")) {
    return false;
  }

  if (value.opacity !== undefined && !isOpacity(value.opacity)) {
    return false;
  }

  if (value.imageUrl !== undefined && !isNonEmptyString(value.imageUrl)) {
    return false;
  }

  if (value.model !== undefined && !isNonEmptyString(value.model)) {
    return false;
  }

  if (value.revisedPrompt !== undefined && typeof value.revisedPrompt !== "string") {
    return false;
  }

  if (value.errorMessage !== undefined && typeof value.errorMessage !== "string") {
    return false;
  }

  if (value.updatedAt !== undefined && !isNonEmptyString(value.updatedAt)) {
    return false;
  }

  if (value.status === "succeeded" && !isNonEmptyString(value.imageUrl)) {
    return false;
  }

  return true;
}

function getImageLayerPatchValidationError(value: unknown) {
  if (isRecord(value) && (value.id !== undefined || value.createdAt !== undefined)) {
    return "图片图层更新不能修改 ID 或创建时间";
  }

  if (isRecord(value) && value.status === "succeeded" && !isNonEmptyString(value.imageUrl)) {
    return "成功图片图层必须包含图片 URL";
  }

  return "图片图层更新补丁不合法";
}

function isUpdatePatch(value: unknown): value is UpdateShapeOperation["patch"] {
  if (!isRecord(value)) {
    return false;
  }

  if (value.x !== undefined && !isFiniteNumber(value.x)) {
    return false;
  }

  if (value.y !== undefined && !isFiniteNumber(value.y)) {
    return false;
  }

  if (value.width !== undefined && !isValidDimension(value.width, "width")) {
    return false;
  }

  if (value.height !== undefined && !isValidDimension(value.height, "height")) {
    return false;
  }

  if (value.rotation !== undefined && !isFiniteNumber(value.rotation)) {
    return false;
  }

  if (value.text !== undefined && typeof value.text !== "string") {
    return false;
  }

  if (value.style !== undefined && !isShapeStyle(value.style, true)) {
    return false;
  }

  return true;
}

function isShapeStyle(value: unknown, allowPartial = false): value is DrawingShapeStyle {
  if (!isRecord(value)) {
    return false;
  }

  if (value.fill !== undefined && typeof value.fill !== "string") {
    return false;
  }

  if (value.stroke !== undefined && typeof value.stroke !== "string") {
    return false;
  }

  if (value.strokeWidth !== undefined && !isFiniteNumber(value.strokeWidth)) {
    return false;
  }

  if (!allowPartial) {
    return true;
  }

  return true;
}

function isKnownShapeId(value: unknown, knownShapeIds: Set<string>): value is string {
  return isNonEmptyString(value) && knownShapeIds.has(value);
}

function isKnownImageLayerId(
  value: unknown,
  knownImageLayerIds: Set<string>,
): value is string {
  return isNonEmptyString(value) && knownImageLayerIds.has(value);
}

function isShapeKind(value: unknown): value is DrawingShapeKind {
  return typeof value === "string" && SHAPE_KINDS.includes(value as DrawingShapeKind);
}

function isValidDimension(value: unknown, dimension: "height" | "width") {
  if (!isFiniteNumber(value)) {
    return false;
  }

  if (dimension === "height") {
    return value >= 0;
  }

  return value > 0;
}

function isImageLayerStatus(value: unknown): value is GeneratedImageLayerStatus {
  return value === "pending" || value === "succeeded" || value === "failed";
}

function isOpacity(value: unknown) {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
