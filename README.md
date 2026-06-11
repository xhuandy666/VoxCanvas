# VoiceCanvas AI

纯语音控制的 AI 绘图工具。用户通过语音指令完成图形创建、样式调整、对象选择、移动、删除、撤销、重做和复杂组合绘制。

## 选题

题目二：AI 语音绘图工具。

要求约束：

- 用户不能使用鼠标或键盘完成绘图创作。
- 仅通过语音指令完成绘图操作。
- 重点考虑指令理解准确性、容错性、语音到绘图操作的响应延迟、复杂指令拆解与执行能力。
- 额外提交设计文档，记录计划支持的指令能力、最终实现情况、未完成部分原因说明。

## 当前阶段

当前处于正式编码前的项目准备阶段，已建立：

- 项目开发文档：`docs/project-development-document.md`
- 开发纪律与提交规范：`docs/development-discipline.md`
- 迭代与 PR 计划：`docs/iteration-plan.md`
- PR 描述模板：`.github/PULL_REQUEST_TEMPLATE.md`

## 技术方向

MVP 优先采用浏览器语音识别能力完成端到端闭环：

- `BrowserSpeechProvider`：默认语音识别实现，基于浏览器 `SpeechRecognition` 能力。
- `SpeechProvider`：统一语音识别接口。
- `LocalSpeechProvider`：仅预留接口，后续有时间可接入 whisper.cpp、faster-whisper 或 Vosk。

绘图能力采用 Web 前端实现，后续根据实现阶段确定 Canvas 或 SVG 渲染方案。

## 提交材料目标

- 公开 GitHub 或 Gitee 仓库。
- README 文档。
- 设计文档。
- Demo 视频链接。
- 持续 PR 与 commit 记录。

## 依赖声明

实际开发中引用的第三方库、框架、模型或参考代码，必须在 README 与对应 PR 描述中说明。当前阶段尚未引入应用运行依赖。
