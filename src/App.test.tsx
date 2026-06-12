import { render, screen } from "@testing-library/react";
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
    expect(screen.getAllByText("画一个蓝色圆形")).toHaveLength(3);
    expect(screen.getByText("create_shape")).toBeInTheDocument();
  });

  it("renders the PR-03 SVG canvas demo shapes", () => {
    render(<App />);

    expect(
      screen.getByRole("img", { name: /rendered drawing canvas/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("shape-demo-circle")).toBeInTheDocument();
    expect(screen.getByTestId("shape-demo-rectangle")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(screen.getByText("语音草图")).toBeInTheDocument();
  });

  it("disables unavailable speech and keeps future canvas actions disabled", () => {
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
