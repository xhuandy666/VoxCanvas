import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

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
    expect(screen.getByText("1 shapes / v1")).toBeInTheDocument();
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
    expect(screen.getByText("2 shapes / v2")).toBeInTheDocument();
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
    expect(screen.getByText("0 shapes / v0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /redo/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /redo/i }));

    expect(await screen.findByLabelText("rectangle shape")).toBeInTheDocument();
    expect(screen.getByText("1 shapes / v1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));

    expect(screen.queryByLabelText("rectangle shape")).not.toBeInTheDocument();
    expect(screen.getByText("0 shapes / v2")).toBeInTheDocument();
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
