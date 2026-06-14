import type {
  CanvasState,
  DrawingShape,
  GeneratedImageLayer,
} from "../drawing/drawingState";
import {
  CANVAS_WORLD_HEIGHT,
  CANVAS_WORLD_WIDTH,
} from "../canvas/canvasWorkspace";

type CanvasRendererProps = {
  state: CanvasState;
};

const DEFAULT_STROKE = "#334155";
const DEFAULT_FILL = "transparent";
const DEFAULT_STROKE_WIDTH = 2;

export function CanvasRenderer({ state }: CanvasRendererProps) {
  const hasContent = state.shapes.length > 0 || state.imageLayers.length > 0;

  return (
    <div className="canvas-renderer">
      <svg
        aria-label="Rendered drawing canvas"
        className="drawing-svg"
        role="img"
        viewBox={`0 0 ${CANVAS_WORLD_WIDTH} ${CANVAS_WORLD_HEIGHT}`}
      >
        <defs>
          <marker
            id="canvas-arrowhead"
            markerHeight="18"
            markerUnits="userSpaceOnUse"
            markerWidth="18"
            orient="auto"
            refX="16"
            refY="9"
            viewBox="0 0 18 18"
          >
            <path d="M 1 1 L 17 9 L 1 17 z" fill="context-stroke" />
          </marker>
        </defs>

        {state.imageLayers.map((layer) => (
          <g
            key={layer.id}
            aria-label={`generated image layer ${layer.status}`}
            className="generated-image-layer"
            data-selected={String(layer.id === state.selectedImageLayerId)}
            data-status={layer.status}
            data-testid={`image-layer-${layer.id}`}
          >
            {renderImageLayer(layer)}
          </g>
        ))}

        {state.shapes.map((shape) => (
          <g
            key={shape.id}
            aria-label={`${shape.kind} shape`}
            className="drawing-shape"
            data-kind={shape.kind}
            data-selected={String(shape.id === state.selectedShapeId)}
            data-testid={`shape-${shape.id}`}
            transform={shape.rotation ? getRotationTransform(shape) : undefined}
          >
            {renderShape(shape)}
          </g>
        ))}
      </svg>

      {!hasContent && (
        <div className="canvas-empty-state">
          <p className="empty-title">Canvas is ready for voice-created shapes.</p>
          <p>Waiting for the first drawing operation.</p>
        </div>
      )}
    </div>
  );
}

function renderImageLayer(layer: GeneratedImageLayer) {
  if (layer.status === "succeeded" && layer.imageUrl) {
    return (
      <image
        className="image-layer-core"
        height={layer.height}
        href={layer.imageUrl}
        opacity={layer.opacity}
        preserveAspectRatio="xMidYMid meet"
        width={layer.width}
        x={layer.x}
        y={layer.y}
      />
    );
  }

  if (layer.status === "pending") {
    return renderPendingImageLayer(layer);
  }

  const title = "Image generation failed";
  const detail = layer.status === "failed" ? layer.errorMessage : layer.prompt;

  return (
    <>
      <rect
        className="image-layer-placeholder"
        fill={layer.status === "failed" ? "#fee2e2" : "#e0f2fe"}
        height={layer.height}
        opacity={layer.opacity}
        rx="14"
        stroke={layer.status === "failed" ? "#dc2626" : "#0284c7"}
        strokeDasharray="10 8"
        strokeWidth="2"
        width={layer.width}
        x={layer.x}
        y={layer.y}
      />
      <text
        className="image-layer-title"
        fill={layer.status === "failed" ? "#991b1b" : "#075985"}
        fontSize="22"
        fontWeight="750"
        x={layer.x + 24}
        y={layer.y + 52}
      >
        {title}
      </text>
      <text
        className="image-layer-detail"
        fill={layer.status === "failed" ? "#7f1d1d" : "#0c4a6e"}
        fontSize="16"
        fontWeight="600"
        x={layer.x + 24}
        y={layer.y + 84}
      >
        {detail ?? ""}
      </text>
    </>
  );
}

function renderPendingImageLayer(layer: GeneratedImageLayer) {
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.height / 2;
  const radius = Math.min(layer.width, layer.height) * 0.07;
  const loaderPath = describeLoaderArc(centerX, centerY, radius);

  return (
    <>
      <rect
        className="image-layer-placeholder"
        fill="#e0f2fe"
        height={layer.height}
        opacity={layer.opacity}
        rx="14"
        stroke="#0284c7"
        strokeDasharray="10 8"
        strokeWidth="2"
        width={layer.width}
        x={layer.x}
        y={layer.y}
      />
      <g className="image-layer-loader" role="status" aria-label="Generating image">
        <circle
          className="image-layer-loader-track"
          cx={centerX}
          cy={centerY}
          r={radius}
        />
        <path className="image-layer-loader-ring" d={loaderPath} />
      </g>
    </>
  );
}

function describeLoaderArc(centerX: number, centerY: number, radius: number) {
  const startX = centerX;
  const startY = centerY - radius;
  const endX = centerX + radius;
  const endY = centerY;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
}

function renderShape(shape: DrawingShape) {
  switch (shape.kind) {
    case "circle":
      return (
        <circle
          className="shape-core"
          cx={shape.x + shape.width / 2}
          cy={shape.y + shape.height / 2}
          fill={shape.style.fill ?? DEFAULT_FILL}
          r={Math.min(shape.width, shape.height) / 2}
          stroke={shape.style.stroke ?? DEFAULT_STROKE}
          strokeWidth={shape.style.strokeWidth ?? DEFAULT_STROKE_WIDTH}
        />
      );

    case "rectangle":
      return (
        <rect
          className="shape-core"
          fill={shape.style.fill ?? DEFAULT_FILL}
          height={shape.height}
          rx="10"
          stroke={shape.style.stroke ?? DEFAULT_STROKE}
          strokeWidth={shape.style.strokeWidth ?? DEFAULT_STROKE_WIDTH}
          width={shape.width}
          x={shape.x}
          y={shape.y}
        />
      );

    case "triangle":
      return (
        <polygon
          className="shape-core"
          fill={shape.style.fill ?? DEFAULT_FILL}
          points={getTrianglePoints(shape)}
          stroke={shape.style.stroke ?? DEFAULT_STROKE}
          strokeWidth={shape.style.strokeWidth ?? DEFAULT_STROKE_WIDTH}
        />
      );

    case "diamond":
      return (
        <polygon
          className="shape-core"
          fill={shape.style.fill ?? DEFAULT_FILL}
          points={getDiamondPoints(shape)}
          stroke={shape.style.stroke ?? DEFAULT_STROKE}
          strokeWidth={shape.style.strokeWidth ?? DEFAULT_STROKE_WIDTH}
        />
      );

    case "ellipse":
      return (
        <ellipse
          className="shape-core"
          cx={shape.x + shape.width / 2}
          cy={shape.y + shape.height / 2}
          fill={shape.style.fill ?? DEFAULT_FILL}
          rx={shape.width / 2}
          ry={shape.height / 2}
          stroke={shape.style.stroke ?? DEFAULT_STROKE}
          strokeWidth={shape.style.strokeWidth ?? DEFAULT_STROKE_WIDTH}
        />
      );

    case "line":
      return (
        <line
          className="shape-core"
          stroke={shape.style.stroke ?? DEFAULT_STROKE}
          strokeLinecap="round"
          strokeWidth={shape.style.strokeWidth ?? DEFAULT_STROKE_WIDTH}
          x1={shape.x}
          x2={shape.x + shape.width}
          y1={shape.y}
          y2={shape.y + shape.height}
        />
      );

    case "arrow":
      return (
        <line
          className="shape-core"
          markerEnd="url(#canvas-arrowhead)"
          stroke={shape.style.stroke ?? DEFAULT_STROKE}
          strokeLinecap="round"
          strokeWidth={shape.style.strokeWidth ?? DEFAULT_STROKE_WIDTH}
          x1={shape.x}
          x2={shape.x + shape.width}
          y1={shape.y}
          y2={shape.y + shape.height}
        />
      );

    case "text":
      return (
        <text
          className="shape-core"
          fill={shape.style.fill ?? DEFAULT_STROKE}
          fontSize={getTextFontSize(shape)}
          fontWeight="750"
          x={shape.x}
          y={shape.y}
        >
          {shape.text ?? ""}
        </text>
      );
  }
}

function getRotationTransform(shape: DrawingShape) {
  return `rotate(${shape.rotation} ${shape.x + shape.width / 2} ${
    shape.y + shape.height / 2
  })`;
}

function getTrianglePoints(shape: DrawingShape) {
  return [
    `${shape.x + shape.width / 2},${shape.y}`,
    `${shape.x + shape.width},${shape.y + shape.height}`,
    `${shape.x},${shape.y + shape.height}`,
  ].join(" ");
}

function getDiamondPoints(shape: DrawingShape) {
  return [
    `${shape.x + shape.width / 2},${shape.y}`,
    `${shape.x + shape.width},${shape.y + shape.height / 2}`,
    `${shape.x + shape.width / 2},${shape.y + shape.height}`,
    `${shape.x},${shape.y + shape.height / 2}`,
  ].join(" ");
}

function getTextFontSize(shape: DrawingShape) {
  return Math.max(14, Math.min(shape.height, 56));
}
