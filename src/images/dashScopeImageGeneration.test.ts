import { describe, expect, it } from "vitest";
import {
  createDashScopeImageGenerationRequestBody,
  extractDashScopeImageGenerationResult,
  sanitizeImageProviderErrorMessage,
} from "./dashScopeImageGeneration";

describe("DashScope image generation helpers", () => {
  it("creates a text-to-image request body for Wan 2.7 image models", () => {
    expect(
      createDashScopeImageGenerationRequestBody({
        mode: "text_to_image",
        prompt: "画一只蓝色的鸟",
      }),
    ).toEqual({
      model: "wan2.7-image-pro",
      input: {
        messages: [
          {
            role: "user",
            content: [{ text: "画一只蓝色的鸟" }],
          },
        ],
      },
      parameters: {
        size: "2K",
        n: 1,
        watermark: false,
        thinking_mode: true,
      },
    });
  });

  it("creates an image editing request body with the source image first", () => {
    expect(
      createDashScopeImageGenerationRequestBody({
        imageUrl: "https://example.com/source.png",
        instruction: "把这只鸟换成红色",
        mode: "image_editing",
        prompt: "画一只蓝色的鸟\n修改指令：把这只鸟换成红色",
      }),
    ).toMatchObject({
      input: {
        messages: [
          {
            content: [
              { image: "https://example.com/source.png" },
              { text: "把这只鸟换成红色" },
            ],
          },
        ],
      },
      parameters: {
        size: "2K",
        n: 1,
        watermark: false,
      },
    });
  });

  it("extracts the first image URL from a DashScope sync response", () => {
    const result = extractDashScopeImageGenerationResult({
      output: {
        choices: [
          {
            message: {
              content: [
                {
                  type: "image",
                  image: "https://dashscope-result.example/output.png",
                },
              ],
            },
          },
        ],
      },
    });

    expect(result).toEqual({
      status: "succeeded",
      imageUrl: "https://dashscope-result.example/output.png",
      model: "wan2.7-image-pro",
      revisedPrompt: undefined,
    });
  });

  it("returns a failed result when the provider response has no image URL", () => {
    expect(
      extractDashScopeImageGenerationResult({
        code: "InvalidApiKey",
        message: "No API-key provided.",
      }),
    ).toEqual({
      status: "failed",
      errorMessage: "No API-key provided.",
    });
  });

  it("redacts API keys from provider error messages", () => {
    expect(
      sanitizeImageProviderErrorMessage(
        "Bearer sk-test-secret123456 failed for request",
      ),
    ).toBe("Bearer [redacted_api_key] failed for request");
  });
});
