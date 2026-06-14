import { describe, expect, it } from "vitest";
import {
  getDashScopeChatCompletionsEndpoint,
  getProviderApiKey,
  getProviderApiKeyName,
  getProviderModel,
  normalizeProviderSemanticPlan,
  getSemanticPlanProvider,
  sanitizeProviderErrorMessage,
} from "./vite.config";

describe("semantic plan provider configuration", () => {
  it("keeps OpenAI as the default semantic planning provider", () => {
    expect(getSemanticPlanProvider({})).toBe("openai");
    expect(getProviderApiKey("openai", { OPENAI_API_KEY: "openai-key" })).toBe(
      "openai-key",
    );
    expect(getProviderApiKeyName("openai")).toBe("OPENAI_API_KEY");
    expect(getProviderModel("openai", {})).toBe("gpt-5.4-mini");
  });

  it("selects DashScope when VOXCANVAS_LLM_PROVIDER is dashscope", () => {
    expect(
      getSemanticPlanProvider({
        VOXCANVAS_LLM_PROVIDER: "dashscope",
      }),
    ).toBe("dashscope");
    expect(
      getProviderApiKey("dashscope", {
        DASHSCOPE_API_KEY: "dashscope-key",
      }),
    ).toBe("dashscope-key");
    expect(getProviderApiKeyName("dashscope")).toBe("DASHSCOPE_API_KEY");
    expect(getProviderModel("dashscope", {})).toBe("qwen3.6-flash");
  });

  it("builds DashScope chat completions endpoint from the configured base URL", () => {
    expect(getDashScopeChatCompletionsEndpoint({})).toBe(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    );
    expect(
      getDashScopeChatCompletionsEndpoint({
        VOXCANVAS_DASHSCOPE_BASE_URL:
          "https://dashscope-us.aliyuncs.com/compatible-mode/v1/",
      }),
    ).toBe(
      "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions",
    );
  });

  it("removes OpenAI API key fragments from provider error messages", () => {
    expect(
      sanitizeProviderErrorMessage(
        "Incorrect API key provided: sk-abc12********************xyz89. Check your key.",
      ),
    ).toBe("Incorrect API key provided: [redacted_api_key] Check your key.");
  });

  it("removes bearer token fragments from provider error messages", () => {
    expect(
      sanitizeProviderErrorMessage(
        "Authorization failed for Bearer dashscope-secret-token-123456.",
      ),
    ).toBe("Authorization failed for Bearer [redacted_api_key]");
  });

  it("normalizes partial provider semantic plans into the full client contract", () => {
    expect(
      normalizeProviderSemanticPlan(
        {
          status: "needs_clarification",
          route: "clarification",
          operations: [],
        },
        "往上一",
      ),
    ).toMatchObject({
      status: "needs_clarification",
      route: "clarification",
      intent: "clarify_command",
      confidence: 0,
      normalizedTranscript: "往上一",
      operations: [],
      operationPreview: [],
      feedback: ["需要澄清：这条语音指令还不足以安全执行"],
    });
  });
});
