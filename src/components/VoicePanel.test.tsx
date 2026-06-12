import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockAppState } from "../data/mockAppState";
import { VoicePanel } from "./VoicePanel";

describe("VoicePanel", () => {
  it("starts browser speech recognition from the voice controls", () => {
    const onStart = vi.fn();

    render(
      <VoicePanel
        onStart={onStart}
        onStop={vi.fn()}
        speechError={null}
        speechStatus="idle"
        state={mockAppState}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start voice/i }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("stops browser speech recognition while listening", () => {
    const onStop = vi.fn();

    render(
      <VoicePanel
        onStart={vi.fn()}
        onStop={onStop}
        speechError={null}
        speechStatus="listening"
        state={{ ...mockAppState, speechStatus: "listening" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /stop voice/i }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("disables start when browser speech recognition is unavailable", () => {
    render(
      <VoicePanel
        onStart={vi.fn()}
        onStop={vi.fn()}
        speechError="Browser speech recognition is unavailable."
        speechStatus="unsupported"
        state={{ ...mockAppState, speechStatus: "unsupported" }}
      />,
    );

    expect(screen.getByRole("button", { name: /start voice/i })).toBeDisabled();
    expect(screen.getByText(/browser speech recognition is unavailable/i)).toBeInTheDocument();
  });

  it("keeps stop disabled until speech recognition is listening", () => {
    render(
      <VoicePanel
        onStart={vi.fn()}
        onStop={vi.fn()}
        speechError={null}
        speechStatus="idle"
        state={mockAppState}
      />,
    );

    expect(screen.getByRole("button", { name: /start voice/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /stop voice/i })).toBeDisabled();
  });
});
