# VoxCanvas

纯语音控制的 AI 绘图工具。用户通过语音指令完成图形创建、样式调整、对象选择、移动、删除、撤销、重做、复杂组合绘制，并在后期通过 AI 生图处理复杂视觉对象和风格化画面。


## 当前阶段

当前处于 PR-19 Demo readiness 阶段，已建立：

- 项目开发文档：`docs/project-development-document.md`
- 开发纪律与提交规范：`docs/development-discipline.md`
- 迭代与 PR 计划：`docs/iteration-plan.md`
- PR 描述模板：`.github/PULL_REQUEST_TEMPLATE.md`
- 产品上下文：`PRODUCT.md`
- PR-01 前端骨架设计摘要：见 `docs/project-development-document.md`
- 可运行前端脚手架：Vite + React + TypeScript
- 画布状态、图形模型与统一绘图操作 schema：`src/drawing/drawingState.ts`
- 大画布 SVG 渲染器与浮动工作区布局：`src/components/CanvasRenderer.tsx`、`src/components/CanvasStage.tsx`、`src/styles.css`
- 浏览器语音识别抽象与实现：`src/speech/browserSpeechProvider.ts`
- 基础本地指令解析器：`src/commands/commandParser.ts`
- 操作队列执行器：`src/operations/operationQueue.ts`
- 历史状态管理器：`src/history/historyManager.ts`
- 语义规划基础模型：`src/planning/semanticPlanner.ts`
- 绘图操作校验器：`src/planning/operationValidator.ts`
- OpenAI Responses API / DashScope 兼容接口请求构造与本地语义规划代理：`src/planning/openAIResponsesPlanner.ts`、`src/planning/openAICompatibleChatPlanner.ts`、`/api/semantic-plan`
- 结构化模板展开器：`src/commands/shapeTemplateExpander.ts`
- 受管理图片图层模型与占位渲染：`GeneratedImageLayer`、`create_image_layer`、`update_image_layer`、`delete_image_layer`
- AI 生图与语音改图任务路由、受管理图片图层、真实 DashScope / 通义万相图片代理与失败回填：`src/planning/intentRouter.ts`、`src/images/imageGenerationService.ts`、`src/images/dashScopeImageGeneration.ts`、`src/images/imageGenerationClient.ts`、`/api/image-generation`

PR-08 后的真实语音测试暴露出规则解析边界：浏览器可能把“圆”识别成“园”，用户也可能说“回到最初状态”“重新来”等未写入规则表的自然表达。后续路线调整为三层能力：基础结构化绘图继续走 `DrawingOperation`；LLM Semantic Planner 负责语义容错、自然表达归一和任务路由；AI 生图后期处理“鸟、人物、风格化场景”等复杂视觉任务，并允许用户继续用语音修改生成图。

## 技术方向

MVP 优先采用浏览器语音识别能力完成端到端闭环：

- `BrowserSpeechProvider`：默认语音识别实现，基于浏览器 `SpeechRecognition` 能力。
- `SpeechProvider`：统一语音识别接口。
- `LocalSpeechProvider`：仅预留接口，后续有时间可接入 whisper.cpp、faster-whisper 或 Vosk。

绘图能力采用 Web 前端实现，当前阶段使用 SVG 渲染圆、矩形、线条、箭头、文本、三角形、菱形、椭圆和受管理图片图层，并通过统一操作队列把基础指令解析结果应用到画布状态。PR-18 将画布升级为轻量大画布工作区：SVG 世界坐标扩大到 `1600 x 1000`，桌面端语音控制和 Command trace 以浮动面板停靠在画布两侧，主画布区域不再被固定三栏持续挤压。画布状态接入历史管理和对象引用后，基础创建、对象移动、对象删除、对象变色、基础尺寸调整、清空、撤销和重做已经形成可验证闭环。结构化模板展开器已支持将“画一座房子”“画一个流程图”拆成多个合法 `create_shape` 操作。PR-17 已能将“画一只蓝色的鸟”等复杂视觉任务路由到 DashScope / 通义万相图片生成代理，并支持在旧图生成成功后继续说“把这只鸟换成红色”“换成水彩风格”等语音改图指令；两者都会先创建 pending 图片图层，再把真实图片 URL 或失败状态回填到同一个受管理图层。AI 图片图层当前默认使用正方形显示区域，并完整显示模型返回图片，避免图片因容器比例不同被裁切。

后续 AI 能力采用“LLM 负责理解语义，规则和 schema 负责约束边界”的路线。简单、确定性的指令继续走本地规则解析；语音误识别、同义表达、模糊指令和复杂组合指令进入 LLM Semantic Planner；结构化绘图最终仍然只能执行合法 `DrawingOperation`。PR-10 主选 OpenAI Responses API 作为语义规划入口；当前本地代理也支持切换到 DashScope OpenAI 兼容接口，例如使用 `qwen3.6-flash` 处理语义规划。默认模型通过 `VOXCANVAS_LLM_MODEL` 配置，API key 只允许放在本地环境变量或后端配置中，不进入前端代码。对于复杂视觉对象，系统会路由到 AI 生图路径；PR-17 使用 DashScope / 通义万相 2.7 图像生成与编辑 HTTP 接口，默认图片模型为 `wan2.7-image-pro`，可通过 `VOXCANVAS_IMAGE_MODEL` 覆盖。官方图像接口模型名为 `wan2.7-image-pro` / `wan2.7-image`，不是 `wan2.7-videoedit`。

## 本地运行

本项目使用 pnpm 管理前端依赖。

运行前需确保 Node.js 与 pnpm 可用；如果命令提示 `node not found`，需要先安装 Node.js 或把 Node.js 加入 PATH。

```bash
pnpm install
pnpm dev
pnpm test:run
pnpm build
```

如果需要启用 PR-10 的真实 LLM 语义容错，在本地复制 `.env.example` 为 `.env` 并填入自己的 API key。仓库只提交 `.env.example`，不要提交 `.env`。

默认配置使用 OpenAI：

```bash
VOXCANVAS_LLM_PROVIDER=openai
OPENAI_API_KEY=...
VOXCANVAS_LLM_MODEL=gpt-5.4-mini
```

若 OpenAI key 不可用，可以切换到阿里云百炼 / DashScope 的 OpenAI 兼容接口：

```bash
VOXCANVAS_LLM_PROVIDER=dashscope
DASHSCOPE_API_KEY=...
VOXCANVAS_LLM_MODEL=qwen3.6-flash
```

修改 `.env` 后需要重启 `pnpm dev`，否则 Vite 本地代理可能仍使用旧配置。若界面显示 `LLM 语义规划暂不可用`，Command trace 会展示脱敏后的失败原因：例如 HTTP 401 通常表示本地 provider API key 无效或当前账户不可用；模型不可用时可在 `.env` 中把 `VOXCANVAS_LLM_MODEL` 改成当前账户可访问的模型。

如果需要启用 PR-17 的真实 AI 生图与语音改图，继续使用同一个 `DASHSCOPE_API_KEY`，并配置图片模型：

```bash
VOXCANVAS_IMAGE_MODEL=wan2.7-image-pro
VOXCANVAS_IMAGE_SIZE=2K
```

当前图片代理端点为本地同源 `/api/image-generation`，由 Vite dev server 读取 `DASHSCOPE_API_KEY` 并调用 DashScope，不会把 key 暴露给前端。图片生成或编辑失败时，画布中的图片图层会从 `pending` 更新为 `failed` 并展示脱敏失败原因；成功时会写入 `imageUrl` 并渲染真实图片。DashScope 返回的结果 URL 有有效期限制，当前 PR-17 先直接保存临时 URL 以完成 Demo 链路；正式持久化缓存和导出策略需要后续单独实现。

当前 PR-19 已在 PR-18 大画布工作区基础上完成 Demo readiness 加固。Demo 主线优先覆盖稳定的语音主链路：基础绘图、颜色和位置控制、对象编辑、连续语音输入重开、删除、撤销、重做、清空、数量指令、房子模板拆解、AI 生图、语音改图，以及“园/圆”这类本地高频语音纠错；同时保留开放 LLM 容错说明和模型服务不稳定时的备用录制路线。

## demo演示

Demo 视频展示了 VoxCanvas 的语音绘图主链路，包括基础图形创建、对象编辑、撤销重做、复杂结构化绘图，以及 AI 生图与语音改图能力。

演示视频：[docs/assets/voxcanvas.mp4](docs/assets/voxcanvas.mp4)

bilibili：https://www.bilibili.com/video/BV1TbJK67EAk/?vd_source=f7977e25303b56b2ffe4eefcaa405927

## 提交材料目标

- 公开 GitHub 或 Gitee 仓库。
- README 文档。
- 设计文档。
- Demo 视频链接。
- 持续 PR 与 commit 记录。

## 依赖声明

实际开发中引用的第三方库、框架、模型或参考代码，必须在 README 与对应 PR 描述中说明。PR-01 引入 Vite、React、TypeScript、Vitest 与 Testing Library，用于前端应用脚手架、类型检查和基础组件测试。同时引入 `@vitejs/plugin-react`、`jsdom`、`@testing-library/jest-dom` 与 React 类型包，用于 React 编译支持、测试 DOM 环境、测试断言扩展和 TypeScript 类型检查。PR-02、PR-03、PR-04、PR-05、PR-06、PR-07、PR-08 与 PR-09 未新增第三方依赖。PR-10 未新增 SDK 依赖，通过 Vite dev server 本地代理调用 OpenAI Responses API；默认语义模型配置为 `VOXCANVAS_LLM_MODEL=gpt-5.4-mini`，真实调用需要用户自行提供 `OPENAI_API_KEY`。PR-16 未新增 SDK 依赖，但本地代理支持通过 DashScope OpenAI 兼容接口调用 `qwen3.6-flash`，真实调用需要用户自行提供 `DASHSCOPE_API_KEY`。PR-17 未新增 SDK 依赖，通过 Vite dev server 本地代理调用 DashScope / 通义万相 2.7 图像生成与编辑 HTTP 接口，默认图片模型为 `wan2.7-image-pro`，真实调用需要用户自行提供 `DASHSCOPE_API_KEY`。PR-11、PR-12、PR-13、PR-14 和 PR-15 未新增第三方依赖。当前未引入语音识别模型、图片生成模型 SDK 或模型权重。
