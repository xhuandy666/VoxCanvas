import type { MockAppState } from "../types/appState";

export const mockAppState: MockAppState = {
  speechStatus: "idle",
  language: "zh-CN",
  transcript: "画一个蓝色圆形",
  parsedIntent: "create_shape",
  operationPreview: ["add shape: circle, color: blue"],
  feedbackLog: ["等待语音输入", "解析结果将在这里显示"],
};
