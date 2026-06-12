import { describe, expect, it } from "vitest";
import { mockAppState } from "./mockAppState";

describe("mockAppState", () => {
  it("keeps PR-01 scaffold state presentational and voice-first", () => {
    expect(mockAppState.speechStatus).toBe("idle");
    expect(mockAppState.language).toBe("zh-CN");
    expect(mockAppState.transcript).toBe("");
    expect(mockAppState.parsedIntent).toBe("unknown");
    expect(mockAppState.operationPreview).toContain("no operation preview");
    expect(mockAppState.feedbackLog).toContain("等待语音输入");
  });
});
