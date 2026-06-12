import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the voice workbench regions around a wide canvas", () => {
    render(<App />);

    expect(
      screen.getByRole("banner", { name: /voicecanvas ai application header/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /voice control/i })).toBeInTheDocument();
    expect(
      screen.getByRole("main", { name: /drawing canvas workspace/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /command trace/i })).toBeInTheDocument();
    expect(screen.getAllByText("画一个蓝色圆形")).toHaveLength(3);
    expect(screen.getByText("create_shape")).toBeInTheDocument();
  });

  it("keeps future canvas actions disabled in PR-01", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /clear/i })).toBeDisabled();
  });

  it("labels the text simulation entry as development-only", () => {
    render(<App />);

    expect(screen.getByText(/development only/i)).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /simulate transcript/i }),
    ).toBeInTheDocument();
  });
});
