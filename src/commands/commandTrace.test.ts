import { describe, expect, it } from "vitest";
import { createCommandTraceState } from "./commandTrace";

describe("createCommandTraceState", () => {
  it("maps parser output into command trace presentation state", () => {
    const traceState = createCommandTraceState("清空画布");

    expect(traceState).toEqual({
      parsedIntent: "clear_canvas",
      operationPreview: ["clear canvas"],
      feedbackLog: ["已解析为清空画布操作"],
    });
  });

  it("keeps unsupported commands visible without operations", () => {
    const traceState = createCommandTraceState("把它向右移动一点");

    expect(traceState).toEqual({
      parsedIntent: "unknown",
      operationPreview: ["no operation preview"],
      feedbackLog: ["暂不支持对象引用指令，将在后续对象引用 PR 中接入"],
    });
  });
});
