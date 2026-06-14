import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { SpeechRecognitionLike } from "./speech/speechProvider";

class FakeSpeechRecognition implements SpeechRecognitionLike {
  continuous = false;
  interimResults = false;
  lang = "";
  onend: (() => void) | null = null;
  onerror: SpeechRecognitionLike["onerror"] = null;
  onresult: SpeechRecognitionLike["onresult"] = null;
  onstart: (() => void) | null = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubBrowserSpeechRecognition(fakeRecognition = new FakeSpeechRecognition()) {
  const SpeechRecognitionConstructor = vi.fn(function SpeechRecognitionConstructor() {
    return fakeRecognition;
  });

  vi.stubGlobal(
    "SpeechRecognition",
    SpeechRecognitionConstructor,
  );

  return fakeRecognition;
}

function emitSpeechResult(
  fakeRecognition: FakeSpeechRecognition,
  transcript: string,
  isFinal = true,
) {
  act(() => {
    fakeRecognition.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal,
          0: {
            transcript,
            confidence: 0.9,
          },
        },
      ],
    });
  });
}

describe("App", () => {
  it("renders the voice workbench regions around a wide canvas", () => {
    render(<App />);

    expect(
      screen.getByRole("banner", { name: /voxcanvas application header/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /voice control/i })).toBeInTheDocument();
    expect(
      screen.getByRole("main", { name: /drawing canvas workspace/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /command trace/i })).toBeInTheDocument();
    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(screen.getByText("no operation preview")).toBeInTheDocument();
    expect(screen.getByText("等待语音输入")).toBeInTheDocument();
  });

  it("renders an empty SVG canvas before the first executable transcript", () => {
    render(<App />);

    expect(
      screen.getByRole("img", { name: /rendered drawing canvas/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Canvas is ready for voice-created shapes."),
    ).toBeInTheDocument();
    expect(screen.getByText("Waiting for the first drawing operation.")).toBeInTheDocument();
    expect(screen.queryByLabelText("circle shape")).not.toBeInTheDocument();
  });

  it("executes a simulated transcript into a canvas shape", async () => {
    render(<App />);

    fireEvent.change(screen.getByRole("textbox", { name: /simulate transcript/i }), {
      target: {
        value: "在左上角画一个红色矩形",
      },
    });

    expect(await screen.findByLabelText("rectangle shape")).toHaveAttribute(
      "data-kind",
      "rectangle",
    );
    expect(screen.getByText("1 shapes / 0 image layers / v1")).toBeInTheDocument();
    expect(screen.getByText("已解析为创建矩形操作")).toBeInTheDocument();
  });

  it("keeps same-kind shapes from separate transcripts", async () => {
    render(<App />);
    const transcriptInput = screen.getByRole("textbox", {
      name: /simulate transcript/i,
    });

    fireEvent.change(transcriptInput, {
      target: {
        value: "在左上角画一个红色矩形",
      },
    });
    fireEvent.change(transcriptInput, {
      target: {
        value: "在右上角画一个蓝色矩形",
      },
    });

    expect(await screen.findAllByLabelText("rectangle shape")).toHaveLength(2);
    expect(screen.getByText("2 shapes / 0 image layers / v2")).toBeInTheDocument();
  });

  it("executes numbered shape creation in one transcript", async () => {
    render(<App />);

    fireEvent.change(screen.getByRole("textbox", { name: /simulate transcript/i }), {
      target: {
        value: "画两个圆",
      },
    });

    expect(await screen.findAllByLabelText("circle shape")).toHaveLength(2);
    expect(screen.getByText("2 shapes / 0 image layers / v2")).toBeInTheDocument();
    expect(screen.getByTestId("shape-voice-circle-1")).toBeInTheDocument();
    expect(screen.getByTestId("shape-voice-circle-1-2")).toBeInTheDocument();
  });

  it("starts a fresh transcript after executing a final browser speech result", async () => {
    const fakeRecognition = stubBrowserSpeechRecognition();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /start voice/i }));
    emitSpeechResult(fakeRecognition, "画一个圆");

    expect(await screen.findByLabelText("circle shape")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /simulate transcript/i })).toHaveValue("");
    expect(screen.getByText("画一个圆")).toBeInTheDocument();

    emitSpeechResult(fakeRecognition, "画一个圆画一个正方形");

    expect(await screen.findByLabelText("rectangle shape")).toBeInTheDocument();
    expect(screen.getByText("2 shapes / 0 image layers / v2")).toBeInTheDocument();
    expect(screen.getByText("画一个正方形")).toBeInTheDocument();
    expect(screen.queryByText("画一个圆画一个正方形")).not.toBeInTheDocument();
  });

  it("enables undo, redo, and clear based on canvas history", async () => {
    render(<App />);
    const transcriptInput = screen.getByRole("textbox", {
      name: /simulate transcript/i,
    });

    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /clear/i })).toBeDisabled();

    fireEvent.change(transcriptInput, {
      target: {
        value: "在左上角画一个红色矩形",
      },
    });

    expect(await screen.findByLabelText("rectangle shape")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /undo/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /clear/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /undo/i }));

    expect(screen.queryByLabelText("rectangle shape")).not.toBeInTheDocument();
    expect(screen.getByText("0 shapes / 0 image layers / v0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /redo/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /redo/i }));

    expect(await screen.findByLabelText("rectangle shape")).toBeInTheDocument();
    expect(screen.getByText("1 shapes / 0 image layers / v1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));

    expect(screen.queryByLabelText("rectangle shape")).not.toBeInTheDocument();
    expect(screen.getByText("0 shapes / 0 image layers / v2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /undo/i })).toBeEnabled();
  });

  it("executes undo and redo simulated transcripts through history", async () => {
    render(<App />);
    const transcriptInput = screen.getByRole("textbox", {
      name: /simulate transcript/i,
    });

    fireEvent.change(transcriptInput, {
      target: {
        value: "在左上角画一个红色矩形",
      },
    });
    expect(await screen.findByLabelText("rectangle shape")).toBeInTheDocument();

    fireEvent.change(transcriptInput, {
      target: {
        value: "撤销",
      },
    });

    expect(screen.queryByLabelText("rectangle shape")).not.toBeInTheDocument();
    expect(screen.getByText("已解析为撤销操作")).toBeInTheDocument();

    fireEvent.change(transcriptInput, {
      target: {
        value: "重做",
      },
    });

    expect(await screen.findByLabelText("rectangle shape")).toBeInTheDocument();
    expect(screen.getByText("已解析为重做操作")).toBeInTheDocument();
  });

  it("executes object-reference move and delete commands", async () => {
    render(<App />);
    const transcriptInput = screen.getByRole("textbox", {
      name: /simulate transcript/i,
    });

    fireEvent.change(transcriptInput, {
      target: {
        value: "在左上角画一个红色矩形",
      },
    });
    fireEvent.change(transcriptInput, {
      target: {
        value: "画一个蓝色圆形",
      },
    });
    expect(await screen.findByTestId("shape-voice-circle-2")).toBeInTheDocument();

    fireEvent.change(transcriptInput, {
      target: {
        value: "把它向右移动一点",
      },
    });

    const movedCircle = screen
      .getByTestId("shape-voice-circle-2")
      .querySelector("circle");

    expect(movedCircle).toHaveAttribute("cx", "540");
    expect(screen.getByText("已解析为移动最近对象操作")).toBeInTheDocument();

    fireEvent.change(transcriptInput, {
      target: {
        value: "删除刚才的矩形",
      },
    });

    expect(screen.queryByTestId("shape-voice-rectangle-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("shape-voice-circle-2")).toBeInTheDocument();
    expect(screen.getByText("已解析为删除矩形操作")).toBeInTheDocument();
  });

  it("executes a structured house template transcript into multiple shapes", async () => {
    render(<App />);

    fireEvent.change(screen.getByRole("textbox", { name: /simulate transcript/i }), {
      target: {
        value: "画一座房子，有红色屋顶、黄色墙体、两个窗户和一扇门",
      },
    });

    expect(await screen.findByTestId("shape-voice-triangle-1-roof")).toHaveAttribute(
      "data-kind",
      "triangle",
    );
    expect(screen.getByTestId("shape-voice-rectangle-1-wall")).toHaveAttribute(
      "data-kind",
      "rectangle",
    );
    expect(screen.getByTestId("shape-voice-rectangle-1-door")).toHaveAttribute(
      "data-kind",
      "rectangle",
    );
    expect(screen.getAllByLabelText("rectangle shape")).toHaveLength(4);
    expect(screen.getByText("5 shapes / 0 image layers / v5")).toBeInTheDocument();
    expect(screen.getByText("已展开房子草图模板")).toBeInTheDocument();
  });

  it("routes complex visual transcripts into a pending generated image layer", async () => {
    render(<App />);

    fireEvent.change(screen.getByRole("textbox", { name: /simulate transcript/i }), {
      target: {
        value: "画一只蓝色的鸟",
      },
    });

    const imageLayer = await screen.findByTestId("image-layer-voice-image-1");

    expect(imageLayer).toHaveAttribute("data-status", "pending");
    expect(screen.getByText("0 shapes / 1 image layers / v1")).toBeInTheDocument();
    expect(screen.getByText("Generating image...")).toBeInTheDocument();
    expect(screen.getAllByText("画一只蓝色的鸟").length).toBeGreaterThan(0);
    expect(screen.getByText("create_image_layer")).toBeInTheDocument();
    expect(
      screen.getByText("queue image generation: 画一只蓝色的鸟"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("已进入 AI 生图队列，等待生成服务返回结果"),
    ).toBeInTheDocument();
  });

  it("routes voice image edits into a new pending image layer and keeps undo history", async () => {
    render(<App />);
    const transcriptInput = screen.getByRole("textbox", {
      name: /simulate transcript/i,
    });

    fireEvent.change(transcriptInput, {
      target: {
        value: "画一只蓝色的鸟",
      },
    });
    expect(await screen.findByTestId("image-layer-voice-image-1")).toHaveAttribute(
      "data-status",
      "pending",
    );

    fireEvent.change(transcriptInput, {
      target: {
        value: "把这只鸟换成红色",
      },
    });

    expect(await screen.findByTestId("image-layer-voice-image-2")).toHaveAttribute(
      "data-status",
      "pending",
    );
    expect(screen.getByText("0 shapes / 2 image layers / v2")).toBeInTheDocument();
    expect(screen.getByText("queue image edit: voice-image-1 -> voice-image-2")).toBeInTheDocument();
    expect(
      screen.getByText("已进入 AI 改图队列，基于上一张图片生成新图层"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /undo/i }));

    expect(screen.queryByTestId("image-layer-voice-image-2")).not.toBeInTheDocument();
    expect(screen.getByTestId("image-layer-voice-image-1")).toBeInTheDocument();
    expect(screen.getByText("0 shapes / 1 image layers / v1")).toBeInTheDocument();
  });

  it("shows semantic clarification without changing the canvas", () => {
    render(<App />);

    fireEvent.change(screen.getByRole("textbox", { name: /simulate transcript/i }), {
      target: {
        value: "把它放大",
      },
    });

    expect(screen.getByText("clarify_reference")).toBeInTheDocument();
    expect(screen.getByText("clarification required: missing_reference")).toBeInTheDocument();
    expect(screen.getByText("需要澄清：我还没有找到可引用的对象。")).toBeInTheDocument();
    expect(screen.getByText("0 shapes / 0 image layers / v0")).toBeInTheDocument();
    expect(screen.queryByLabelText("circle shape")).not.toBeInTheDocument();
  });

  it("keeps the last command trace while reopening an empty transcript", () => {
    render(<App />);
    const transcriptInput = screen.getByRole("textbox", {
      name: /simulate transcript/i,
    });

    fireEvent.change(transcriptInput, {
      target: {
        value: "画一个蓝色圆形",
      },
    });
    fireEvent.change(transcriptInput, {
      target: {
        value: "",
      },
    });

    expect(screen.getByText("create_shape")).toBeInTheDocument();
    expect(screen.getByText("画一个蓝色圆形")).toBeInTheDocument();
    expect(screen.getByText("已解析为创建圆形操作")).toBeInTheDocument();
    expect(transcriptInput).toHaveValue("");
  });

  it("executes an LLM semantic correction from the planning endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "matched",
          route: "structured_drawing",
          intent: "create_shape",
          confidence: 0.91,
          normalizedTranscript: "画一个圆形",
          operations: [
            {
              type: "create_shape",
              shape: {
                id: "llm-circle-1",
                kind: "circle",
                x: 410,
                y: 230,
                width: 140,
                height: 140,
                rotation: 0,
                style: {
                  fill: "#2563eb",
                  stroke: "#1d4ed8",
                  strokeWidth: 2,
                },
              },
            },
          ],
          operationPreview: ["add shape: circle, color: blue"],
          feedback: ["已将“园”理解为圆形"],
        }),
      }),
    );
    render(<App />);

    fireEvent.change(screen.getByRole("textbox", { name: /simulate transcript/i }), {
      target: {
        value: "画一个园",
      },
    });

    expect(await screen.findByTestId("shape-llm-circle-1")).toBeInTheDocument();
    expect(screen.getByText("已将“园”理解为圆形")).toBeInTheDocument();
  });

  it("executes natural reset expressions on the local fast path", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    render(<App />);
    const transcriptInput = screen.getByRole("textbox", {
      name: /simulate transcript/i,
    });

    fireEvent.change(transcriptInput, {
      target: {
        value: "画一个蓝色圆形",
      },
    });
    expect(await screen.findByLabelText("circle shape")).toBeInTheDocument();

    fireEvent.change(transcriptInput, {
      target: {
        value: "回到最初状态",
      },
    });

    expect(await screen.findByText("0 shapes / 0 image layers / v2")).toBeInTheDocument();
    expect(screen.queryByLabelText("circle shape")).not.toBeInTheDocument();
    expect(screen.getByText("已解析为清空画布操作")).toBeInTheDocument();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps diagnostic LLM failures visible after reopening the transcript input", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: "OpenAI Responses API 返回 HTTP 401：Incorrect API key provided: [redacted_api_key]",
        }),
      }),
    );
    render(<App />);
    const transcriptInput = screen.getByRole("textbox", {
      name: /simulate transcript/i,
    });

    fireEvent.change(transcriptInput, {
      target: {
        value: "帮我理解这句话",
      },
    });

    expect(await screen.findByText(/LLM 语义规划暂不可用/)).toBeInTheDocument();
    expect(transcriptInput).toHaveValue("");
    expect(screen.getByText("帮我理解这句话")).toBeInTheDocument();
  });

  it("disables unavailable speech while keeping empty history actions disabled", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: /start voice/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /clear/i })).toBeDisabled();
  });

  it("keeps canvas first in source order for narrow-screen linear navigation", () => {
    render(<App />);

    const workbench = screen.getByLabelText("VoxCanvas workbench");

    expect(workbench.children[0]).toHaveAccessibleName("Drawing canvas workspace");
    expect(workbench.children[1]).toHaveAccessibleName("Voice control");
    expect(workbench.children[2]).toHaveAccessibleName("Command trace");
  });

  it("labels the text simulation entry as development-only", () => {
    render(<App />);

    expect(screen.getByText(/development only/i)).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /simulate transcript/i }),
    ).toBeInTheDocument();
  });
});
