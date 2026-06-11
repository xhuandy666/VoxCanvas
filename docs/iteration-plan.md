# 迭代与 PR 计划

日期：2026-06-12

## 1. 迭代目标

通过持续、小粒度 PR 完成作品，避免临尾突击提交。每个 PR 合并后，`main` 分支都应保持可运行。

## 2. 推荐 PR 顺序

| PR | 分支建议 | 目标 | 验证方式 |
| --- | --- | --- | --- |
| PR-00 | `docs/project-charter` | 建立 README、开发文档、纪律、PR 模板 | 检查文档完整性 |
| PR-01 | `feat/app-scaffold` | 创建前端项目脚手架和基础页面 | 应用能启动并显示主界面 |
| PR-02 | `feat/drawing-state` | 建立画布状态、图形模型、操作 schema | 单元测试覆盖状态变更 |
| PR-03 | `feat/canvas-renderer` | 渲染圆、矩形、线条、箭头、文本 | 手动检查图形显示 |
| PR-04 | `feat/browser-speech-provider` | 接入浏览器语音识别接口 | 浏览器可识别语音文本 |
| PR-05 | `feat/command-parser` | 实现基础指令解析 | 单元测试覆盖常用指令 |
| PR-06 | `feat/operation-queue` | 将解析结果按操作队列执行 | 输入文本可生成画布变化 |
| PR-07 | `feat/history-manager` | 支持撤销、重做、清空 | 单元测试和手动测试 |
| PR-08 | `feat/object-reference` | 支持“它”“刚才的圆”等对象引用 | 手动测试多对象场景 |
| PR-09 | `feat/clarification-feedback` | 模糊指令澄清和语音反馈 | 手动测试错误和模糊输入 |
| PR-10 | `feat/complex-command-planner` | 支持复杂组合指令拆解 | 固定样例测试 |
| PR-11 | `docs/demo-readiness` | 完成 README、设计文档和 Demo 脚本 | 按 Demo 脚本完整跑通 |
| PR-12 | `fix/polish-and-hardening` | 修复演示问题和体验细节 | 全量回归测试 |

## 3. PR 拆分原则

- 如果一个 PR 超过一个清晰目标，需要拆分。
- 先做模型和测试，再接界面和语音。
- 先保证文本模拟指令可测试，再接真实麦克风。
- 复杂 AI 能力放在基础闭环之后，避免主链路不稳定。

## 4. 固定评测样例

后续测试至少覆盖这些语音文本：

```text
画一个蓝色圆形
在左上角画一个红色矩形
把它向右移动一点
把刚才的圆变大
删除刚才的矩形
撤销
重做
清空画布
画一座房子，有红色屋顶、黄色墙体、两个窗户和一扇门
```

## 5. 文档更新节点

每完成一个能力，需要更新：

- README 功能列表。
- `docs/project-development-document.md` 中的实现状态。
- PR 描述中的测试记录。

最终提交前，需要补充：

- Demo 视频链接。
- 已完成能力清单。
- 未完成能力和原因。
- 第三方依赖与原创功能边界。
