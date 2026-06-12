# VoxCanvas

纯语音控制的 AI 绘图工具。用户通过语音指令完成图形创建、样式调整、对象选择、移动、删除、撤销、重做和复杂组合绘制。

## 选题

题目二：AI 语音绘图工具。

要求约束：

- 用户不能使用鼠标或键盘完成绘图创作。
- 仅通过语音指令完成绘图操作。
- 重点考虑指令理解准确性、容错性、语音到绘图操作的响应延迟、复杂指令拆解与执行能力。
- 额外提交设计文档，记录计划支持的指令能力、最终实现情况、未完成部分原因说明。

## 当前阶段

当前处于 PR-04 浏览器语音识别阶段，已建立：

- 项目开发文档：`docs/project-development-document.md`
- 开发纪律与提交规范：`docs/development-discipline.md`
- 迭代与 PR 计划：`docs/iteration-plan.md`
- PR 描述模板：`.github/PULL_REQUEST_TEMPLATE.md`
- 产品上下文：`PRODUCT.md`
- PR-01 前端骨架设计摘要：见 `docs/project-development-document.md`
- 可运行前端脚手架：Vite + React + TypeScript
- 画布状态、图形模型与统一绘图操作 schema：`src/drawing/drawingState.ts`
- SVG 画布渲染器：`src/components/CanvasRenderer.tsx`
- 浏览器语音识别抽象与实现：`src/speech/browserSpeechProvider.ts`

## 技术方向

MVP 优先采用浏览器语音识别能力完成端到端闭环：

- `BrowserSpeechProvider`：默认语音识别实现，基于浏览器 `SpeechRecognition` 能力。
- `SpeechProvider`：统一语音识别接口。
- `LocalSpeechProvider`：仅预留接口，后续有时间可接入 whisper.cpp、faster-whisper 或 Vosk。

绘图能力采用 Web 前端实现，当前阶段使用 SVG 渲染圆、矩形、线条、箭头和文本，后续指令解析与操作队列会复用同一画布状态模型。

## 本地运行

本项目使用 pnpm 管理前端依赖。

运行前需确保 Node.js 与 pnpm 可用；如果命令提示 `node not found`，需要先安装 Node.js 或把 Node.js 加入 PATH。

```bash
pnpm install
pnpm dev
pnpm test:run
pnpm build
```

当前 PR-04 已提供画布状态模型、SVG 静态渲染能力、`SpeechProvider` 抽象和浏览器语音识别入口。应用可以通过浏览器 `SpeechRecognition` 获取语音文本并显示在 transcript 区域，但仍不会解析真实语音指令或执行绘图操作；指令解析将在后续 PR 接入。

## 提交材料目标

- 公开 GitHub 或 Gitee 仓库。
- README 文档。
- 设计文档。
- Demo 视频链接。
- 持续 PR 与 commit 记录。

## 依赖声明

实际开发中引用的第三方库、框架、模型或参考代码，必须在 README 与对应 PR 描述中说明。PR-01 引入 Vite、React、TypeScript、Vitest 与 Testing Library，用于前端应用脚手架、类型检查和基础组件测试。同时引入 `@vitejs/plugin-react`、`jsdom`、`@testing-library/jest-dom` 与 React 类型包，用于 React 编译支持、测试 DOM 环境、测试断言扩展和 TypeScript 类型检查。PR-02、PR-03 与 PR-04 未新增第三方依赖。当前未引入语音识别模型、图片生成模型、LLM SDK 或后端服务依赖。
