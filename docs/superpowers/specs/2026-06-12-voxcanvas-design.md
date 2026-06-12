# VoxCanvas Design Spec

日期：2026-06-12

## 决策摘要

项目选择企业实训营题目二：AI 语音绘图工具。

MVP 决策：

- 主链路采用浏览器语音识别。
- 本地语音识别仅保留 `LocalSpeechProvider` 接口和未来计划。
- 产品核心评分点放在纯语音绘图闭环、指令理解、容错、复杂指令拆解、画布状态管理和持续 PR 记录。

## 正式文档

本项目的完整开发文档位于：

- `docs/project-development-document.md`
- `docs/development-discipline.md`
- `docs/iteration-plan.md`

后续实现前，应先阅读以上文档，并按 `.github/PULL_REQUEST_TEMPLATE.md` 填写每个 PR 的功能描述、实现思路和测试方式。

## 范围边界

MVP 必须完成浏览器语音识别到绘图操作的端到端闭环。本地部署语音识别、多人协作、图片生成模型和账户系统不进入 MVP 强制范围。

## 用户确认

用户已确认：先主要完成浏览器语音识别，把本地语音识别写进项目未来计划，只预留接口，后续有时间再进一步实现。
