import { describe, expect, it } from "vitest";
import { mockAppState } from "./mockAppState";

describe("mockAppState", () => {
  it("keeps PR-01 scaffold state presentational and voice-first", () => {
    expect(mockAppState.speechStatus).toBe("idle");
    expect(mockAppState.language).toBe("zh-CN");
    expect(mockAppState.transcript).toContain("画一个蓝色圆形");
    expect(mockAppState.parsedIntent).toBe("create_shape");
    expect(mockAppState.operationPreview).toContain("add shape: circle, color: blue");
    expect(mockAppState.feedbackLog).toContain("等待语音输入");
  });
});
