# PR-01 App Scaffold Design

日期：2026-06-12

## 决策摘要

PR-01 的目标是建立 VoxCanvas 的可运行前端脚手架和第一版应用骨架。它不实现真实语音识别、绘图引擎、指令解析、操作队列、历史栈或 AI/LLM 能力。

本 PR 采用方案 A：`Voice Workbench`。桌面端使用两边窄、中间宽的三栏布局：

- 左侧窄栏：语音控制与识别状态。
- 中间宽区：主画布工作区。
- 右侧窄栏：指令解释、操作预览和反馈日志。

这样可以让画布成为视觉焦点，同时保留“语音文本 -> 解析结果 -> 绘图操作”的可解释链路。

## 产品上下文

本设计遵循根目录 `PRODUCT.md`：

- Register：product。
- 主要用户：需要快速草图表达的普通用户、需要无障碍创作的用户。
- 品牌气质：清晰、可信、创造感。
- 设计目标：语音优先，状态可见，系统理解过程可检查。
- 可访问性底线：以 WCAG 2.2 AA 作为设计目标和检查基线，MVP 不声明正式认证；PR-01 至少保证可读对比度、语义控件、可见 focus state 和基础键盘可访问。

## 技术选择

PR-01 使用：

- Vite
- React
- TypeScript
- CSS Modules 或普通 CSS 变量

选择原因：

- 启动成本低，适合小步 PR。
- 前端优先，符合 MVP 不引入复杂后端的项目路线。
- TypeScript 方便后续逐步引入 `SpeechProvider`、绘图对象模型和统一 operation schema。
- 不在 PR-01 引入 UI 组件库，避免早期依赖过重；先建立轻量本地组件和 design tokens。

## 信息架构

### 桌面布局

桌面端采用三栏 workbench：

```text
┌──────────────────────────────────────────────────────────────┐
│ Top bar: product name, status summary, future global controls │
├───────────────┬──────────────────────────────┬───────────────┤
│ Voice Panel   │ Canvas Workspace             │ Command Trace │
│ narrow        │ wide primary area            │ narrow        │
└───────────────┴──────────────────────────────┴───────────────┘
```

建议比例：

- 左侧栏约 220-260px。
- 中间画布使用剩余宽度，最小宽度优先保护。
- 右侧栏约 260-300px。

### 窄屏布局

平板和手机端按任务优先级堆叠：

1. 顶部状态栏。
2. 画布工作区。
3. 语音控制。
4. 指令解释与反馈日志。

规则：画布不能被挤到不可用，也不能被左右栏抢走主视觉。

## 组件设计

### `AppShell`

负责页面整体框架：

- 顶部栏。
- 三栏 workbench。
- 响应式布局。
- 全局背景、间距和 design token 使用。

PR-01 中不承载业务状态管理，只接收或导入静态占位数据。

### `VoicePanel`

左侧窄栏，展示语音入口与识别状态。

PR-01 内容：

- 麦克风状态占位，例如 `Idle`、`Browser speech pending`。
- 识别语言占位，例如 `zh-CN`。
- 当前 transcript 占位。
- 主按钮：`Start voice`，暂不绑定真实语音识别。
- 开发用模拟输入区域，必须明确标注为 `Development only`。

边界：

- 不实现 `SpeechProvider`。
- 不申请麦克风权限。
- 不连接浏览器 `SpeechRecognition`。

### `CanvasStage`

中间主工作区，是 PR-01 的视觉重点。

PR-01 内容：

- 大面积画布占位。
- 空画布状态。
- 轻量网格、边界或坐标感提示。
- 可选静态示例轮廓，用于表达未来绘图区域，但不能伪装成真实绘图能力。

边界：

- 不实现 canvas/SVG 绘图引擎。
- 不维护真实对象列表。
- 不支持鼠标绘制。

### `CommandTracePanel`

右侧窄栏，展示系统如何理解语音输入。

PR-01 内容：

- 识别文本占位。
- 解析意图占位，例如 `create_shape`。
- 操作预览占位，例如 `add circle`。
- 反馈日志占位，例如“等待语音输入”“解析结果将显示在这里”。

边界：

- 不实现 `CommandParser`。
- 不实现 `CommandPlanner`。
- 不实现 `OperationQueue`。

### `TopBar`

顶部栏用于保持产品身份和基本状态。

PR-01 内容：

- 产品名 `VoxCanvas`。
- 简短状态，例如 `Prototype scaffold`。
- 未来全局能力占位，例如 undo/redo/clear 的 disabled 按钮。

边界：

- undo/redo/clear 仅作为 disabled 或 non-functional 占位。

## 视觉系统

PR-01 使用克制 product UI，而不是营销页或 AI landing page。

物理场景句：

> 用户在安静的桌面环境里，用语音快速把脑中的结构草图落到画布上；界面像一个可靠的工作台，帮助用户确认系统听到、理解并准备执行了什么。

色彩策略：Restrained。

配色基于 `impeccable` 给出的 teal seed：

- Primary anchor：围绕 `oklch(0.750 0.080 170.0)` 调整。
- Background：白色或极接近纯白。
- Surface：轻微中性层，用于侧栏和工具区。
- Ink：高对比文本色。
- Accent：少量 coral/rust，用于 warning、dev-only 或强调状态。

实现要求：

- 使用 OKLCH CSS custom properties。
- 避免紫色 AI 渐变、玻璃拟态、大面积装饰阴影。
- 字体使用 system sans。
- 控件圆角保持 8-12px；按钮可使用 pill 形，但面板不使用过大圆角。
- 所有交互控件有 hover、focus、disabled 基础状态。
- `prefers-reduced-motion` 下禁用非必要动效。

## 状态与占位数据

PR-01 使用静态 `mockAppState` 或等价常量驱动页面展示。

建议结构：

```ts
type MockAppState = {
  speechStatus: "idle" | "unsupported" | "ready";
  language: string;
  transcript: string;
  parsedIntent: string;
  operationPreview: string[];
  feedbackLog: string[];
};
```

示例内容：

- transcript：`画一个蓝色圆形`
- parsedIntent：`create_shape`
- operationPreview：`add shape: circle, color: blue`
- feedbackLog：`等待语音输入`、`解析结果将在这里显示`

这些数据只用于 UI 占位，不作为后续真实 schema 的最终承诺。

## 错误与空状态

PR-01 至少展示三类状态：

- 语音识别暂不可用：提示后续将检测浏览器能力。
- 尚无语音输入：transcript 区域为空状态。
- 画布尚无对象：画布区域显示空状态。

所有状态文案应短、直接、可操作，不写成营销说明。

## 测试与验收

PR-01 完成后需要验证：

- 本地安装依赖后应用可以启动。
- 页面显示 `VoxCanvas` 应用骨架。
- 桌面端呈现两边窄、中间宽的 workbench。
- 窄屏下区域不重叠、不横向溢出。
- 主按钮、输入框、disabled 控件有可见 focus/disabled 状态。
- 构建或基础测试命令通过。
- 仓库未提交 `.env`、录音样本、构建产物或模型文件。

PR-01 不验收：

- 真实麦克风权限申请。
- 浏览器语音识别。
- 真实画布绘制。
- 指令解析。
- 操作队列。
- 撤销/重做。
- LLM/API key 配置。

## 文档影响

PR-01 实现完成时应更新：

- `README.md`：补充启动方式、当前已完成能力、依赖声明。
- `docs/project-development-document.md`：将 PR-01 对应状态从计划实现更新为脚手架完成或基础页面完成。

## 用户确认记录

用户已确认：

- PR-01 从可运行前端骨架开始。
- 主界面采用方案 A：Voice Workbench。
- 中间画布面积要扩大，形成两边窄、中间画布宽的格局。
- 组件与视觉方向采用克制 product UI，语音优先但状态可见。
- PR-01 只做静态结构、占位状态和启动验证，不提前实现真实语音、绘图、解析或 AI 能力。
