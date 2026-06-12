import { describe, expect, it } from "vitest";
import { createEmptyCanvasState, type DrawingOperation } from "../drawing/drawingState";
import { validateDrawingOperations } from "../planning/operationValidator";
import { expandShapeTemplate } from "./shapeTemplateExpander";

function getCreatedShapeKinds(operations: DrawingOperation[]) {
  return operations.map((operation) => {
    expect(operation.type).toBe("create_shape");

    if (operation.type !== "create_shape") {
      throw new Error("Expected create_shape operation");
    }

    return operation.shape.kind;
  });
}

function getCreatedShapeIds(operations: DrawingOperation[]) {
  return operations.map((operation) => {
    expect(operation.type).toBe("create_shape");

    if (operation.type !== "create_shape") {
      throw new Error("Expected create_shape operation");
    }

    return operation.shape.id;
  });
}

describe("expandShapeTemplate", () => {
  it("expands a house sketch into legal drawing operations", () => {
    const result = expandShapeTemplate("house", {
      createShapeId: (kind) => `house-${kind}`,
      transcript: "画一座房子，有红色屋顶、黄色墙体、两个窗户和一扇门",
    });

    expect(result.template).toBe("house");
    expect(getCreatedShapeKinds(result.operations)).toEqual([
      "rectangle",
      "triangle",
      "rectangle",
      "rectangle",
      "rectangle",
    ]);
    expect(new Set(getCreatedShapeIds(result.operations)).size).toBe(
      result.operations.length,
    );
    expect(result.operationPreview).toEqual([
      "expand template: house, shapes: wall, roof, window-left, window-right, door",
    ]);
    expect(result.feedback).toEqual(["已展开房子草图模板"]);

    const validation = validateDrawingOperations(result.operations, createEmptyCanvasState());

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("expands a flowchart into legal drawing operations", () => {
    const result = expandShapeTemplate("flowchart", {
      createShapeId: (kind) => `flowchart-${kind}`,
      transcript: "画一个流程图",
    });

    expect(result.template).toBe("flowchart");
    expect(getCreatedShapeKinds(result.operations)).toEqual([
      "ellipse",
      "arrow",
      "diamond",
      "arrow",
      "rectangle",
      "text",
      "text",
      "text",
    ]);
    expect(new Set(getCreatedShapeIds(result.operations)).size).toBe(
      result.operations.length,
    );
    expect(result.operationPreview).toEqual([
      "expand template: flowchart, shapes: start, decision, process, labels",
    ]);
    expect(result.feedback).toEqual(["已展开流程图模板"]);

    const validation = validateDrawingOperations(result.operations, createEmptyCanvasState());

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });
});
