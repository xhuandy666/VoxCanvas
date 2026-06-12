export type DrawingShapeKind =
  | "circle"
  | "rectangle"
  | "line"
  | "arrow"
  | "text"
  | "triangle"
  | "diamond"
  | "ellipse";

export type DrawingShapeStyle = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};

export type DrawingShape = {
  id: string;
  kind: DrawingShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text?: string;
  style: DrawingShapeStyle;
};

export type CanvasState = {
  shapes: DrawingShape[];
  selectedShapeId: string | null;
  lastShapeId: string | null;
  version: number;
};

export type CreateShapeOperation = {
  type: "create_shape";
  shape: DrawingShape;
};

export type UpdateShapeOperation = {
  type: "update_shape";
  shapeId: string;
  patch: Partial<Omit<DrawingShape, "id" | "kind" | "style">> & {
    style?: Partial<DrawingShapeStyle>;
  };
};

export type MoveShapeOperation = {
  type: "move_shape";
  shapeId: string;
  deltaX: number;
  deltaY: number;
};

export type DeleteShapeOperation = {
  type: "delete_shape";
  shapeId: string;
};

export type ClearCanvasOperation = {
  type: "clear_canvas";
};

export type DrawingOperation =
  | CreateShapeOperation
  | UpdateShapeOperation
  | MoveShapeOperation
  | DeleteShapeOperation
  | ClearCanvasOperation;

export function createEmptyCanvasState(): CanvasState {
  return {
    shapes: [],
    selectedShapeId: null,
    lastShapeId: null,
    version: 0,
  };
}

export function applyDrawingOperation(
  state: CanvasState,
  operation: DrawingOperation,
): CanvasState {
  switch (operation.type) {
    case "create_shape": {
      const hasShape = state.shapes.some((shape) => shape.id === operation.shape.id);

      if (hasShape) {
        return state;
      }

      const nextShape: DrawingShape = {
        ...operation.shape,
        style: {
          ...operation.shape.style,
        },
      };

      return {
        ...state,
        shapes: [...state.shapes, nextShape],
        selectedShapeId: nextShape.id,
        lastShapeId: nextShape.id,
        version: state.version + 1,
      };
    }

    case "update_shape": {
      const shapeIndex = state.shapes.findIndex((shape) => shape.id === operation.shapeId);

      if (shapeIndex === -1) {
        return state;
      }

      const nextShapes = state.shapes.map((shape, index) => {
        if (index !== shapeIndex) {
          return shape;
        }

        return {
          ...shape,
          ...operation.patch,
          style: {
            ...shape.style,
            ...operation.patch.style,
          },
        };
      });

      return {
        ...state,
        shapes: nextShapes,
        selectedShapeId: operation.shapeId,
        lastShapeId: operation.shapeId,
        version: state.version + 1,
      };
    }

    case "move_shape": {
      const shapeIndex = state.shapes.findIndex((shape) => shape.id === operation.shapeId);

      if (shapeIndex === -1) {
        return state;
      }

      const nextShapes = state.shapes.map((shape, index) => {
        if (index !== shapeIndex) {
          return shape;
        }

        return {
          ...shape,
          x: shape.x + operation.deltaX,
          y: shape.y + operation.deltaY,
        };
      });

      return {
        ...state,
        shapes: nextShapes,
        selectedShapeId: operation.shapeId,
        lastShapeId: operation.shapeId,
        version: state.version + 1,
      };
    }

    case "delete_shape": {
      const hasShape = state.shapes.some((shape) => shape.id === operation.shapeId);

      if (!hasShape) {
        return state;
      }

      return {
        ...state,
        shapes: state.shapes.filter((shape) => shape.id !== operation.shapeId),
        selectedShapeId:
          state.selectedShapeId === operation.shapeId ? null : state.selectedShapeId,
        lastShapeId: state.lastShapeId === operation.shapeId ? null : state.lastShapeId,
        version: state.version + 1,
      };
    }

    case "clear_canvas":
      return {
        shapes: [],
        selectedShapeId: null,
        lastShapeId: null,
        version: state.version + 1,
      };
  }
}
