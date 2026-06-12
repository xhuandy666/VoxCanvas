import { describe, expect, it, vi } from "vitest";
import { BrowserSpeechProvider } from "./browserSpeechProvider";
import type { SpeechRecognitionLike } from "./speechProvider";

class FakeSpeechRecognition implements SpeechRecognitionLike {
  continuous = false;
  interimResults = false;
  lang = "";
  onend: (() => void) | null = null;
  onerror: ((event: { error: string; message?: string }) => void) | null = null;
  onresult: SpeechRecognitionLike["onresult"] = null;
  onstart: (() => void) | null = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());
}

function createProvider(fakeRecognition = new FakeSpeechRecognition()) {
  return {
    fakeRecognition,
    provider: new BrowserSpeechProvider({
      language: "zh-CN",
      recognitionFactory: () => fakeRecognition,
    }),
  };
}

describe("BrowserSpeechProvider", () => {
  it("detects support from an injected recognition factory", () => {
    expect(
      new BrowserSpeechProvider({ recognitionFactory: () => null }).isSupported(),
    ).toBe(false);
    expect(createProvider().provider.isSupported()).toBe(true);
  });

  it("starts recognition with the configured language and status events", async () => {
    const { fakeRecognition, provider } = createProvider();
    const statuses: string[] = [];
    provider.onStatusChange((status) => statuses.push(status));

    await provider.start();

    expect(fakeRecognition.lang).toBe("zh-CN");
    expect(fakeRecognition.continuous).toBe(true);
    expect(fakeRecognition.interimResults).toBe(true);
    expect(fakeRecognition.start).toHaveBeenCalledOnce();
    expect(statuses).toEqual(["listening"]);
  });

  it("normalizes interim and final speech recognition results", async () => {
    const { fakeRecognition, provider } = createProvider();
    const results: Array<{ transcript: string; isFinal: boolean; confidence: number }> =
      [];
    provider.onResult((result) =>
      results.push({
        transcript: result.transcript,
        isFinal: result.isFinal,
        confidence: result.confidence,
      }),
    );

    await provider.start();
    fakeRecognition.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal: false,
          0: {
            transcript: "  画一个蓝色圆形 ",
            confidence: 0.72,
          },
        },
        {
          isFinal: true,
          0: {
            transcript: "画一个红色矩形",
            confidence: 0.9,
          },
        },
      ],
    });

    expect(results).toEqual([
      {
        transcript: "画一个蓝色圆形",
        isFinal: false,
        confidence: 0.72,
      },
      {
        transcript: "画一个红色矩形",
        isFinal: true,
        confidence: 0.9,
      },
    ]);
  });

  it("maps provider errors and stops recognition", async () => {
    const { fakeRecognition, provider } = createProvider();
    const errors: string[] = [];
    const statuses: string[] = [];
    provider.onError((error) => errors.push(error.code));
    provider.onStatusChange((status) => statuses.push(status));

    await provider.start();
    fakeRecognition.onerror?.({ error: "not-allowed", message: "permission denied" });
    provider.stop();

    expect(errors).toEqual(["not_allowed"]);
    expect(statuses).toEqual(["listening", "error", "idle"]);
    expect(fakeRecognition.stop).toHaveBeenCalledOnce();
  });
});
