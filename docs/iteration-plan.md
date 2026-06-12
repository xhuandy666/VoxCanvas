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
| PR-09 | `feat/semantic-planner-foundation` | 建立语义规划结果模型、澄清状态和操作校验基础，不接真实 LLM | 单元测试覆盖 matched、unsupported、needs_clarification 和非法操作拦截 |
| PR-10 | `feat/llm-semantic-planner` | 接入 LLM Semantic Planner，处理“园/圆”“回到最初状态”等语音误差和自然表达归一 | 固定语义容错样例测试，手动测试真实语音误识别场景 |
| PR-11 | `feat/drawing-operation-schema-expansion` | 扩展 `DrawingOperation` schema 和渲染能力，为复合对象提供更丰富图形原语或模板结构 | 单元测试覆盖新增 operation，手动检查新增图形渲染 |
| PR-12 | `feat/structured-object-planner` | 支持“画一个房子草图”“画一个流程图”等结构化复合对象拆解与模板展开 | 固定结构化样例测试，检查每一步仍生成合法操作 |
| PR-13 | `feat/generated-image-layer` | 建立 AI 生图图片图层模型、渲染占位、历史接入和生成状态 | 单元测试覆盖图片图层状态，手动检查图片图层显示和撤销 |
| PR-14 | `feat/ai-image-generation-route` | 将“画一只蓝色的鸟”等复杂视觉任务路由到 AI 生图路径 | mock 生成服务测试，手动验证生成中、成功、失败反馈 |
| PR-15 | `feat/voice-image-editing` | 支持“把这只鸟换成红色”“换成水彩风格”等基于旧图的语音改图 | mock 图片编辑测试，验证旧图进入历史且新图覆盖当前图层 |
| PR-16 | `docs/demo-readiness` | 完成 README、设计文档和 Demo 脚本 | 按 Demo 脚本完整跑通 |
| PR-17 | `fix/polish-and-hardening` | 修复演示问题和体验细节 | 全量回归测试 |

## 3. PR 拆分原则

- 如果一个 PR 超过一个清晰目标，需要拆分。
- 先做模型和测试，再接界面和语音。
- 先保证文本模拟指令可测试，再接真实麦克风。
- 复杂 AI 能力放在基础闭环之后，避免主链路不稳定。
- 语义理解和绘图能力分开迭代：先用 LLM 解决“用户想表达什么”，再扩展 `DrawingOperation` 解决“系统能画出什么”。
- LLM 不能直接修改画布、DOM 或 SVG；它只能输出结构化规划结果，最终必须通过 schema 和操作校验。
- 不针对单个测试用例硬编码特殊逻辑；语音误识别、同义表达和复合对象都应通过可泛化的规划层或 schema 扩展解决。
- 复杂视觉对象和风格化画面可以走 AI 生图路线，但图片生成必须作为受管理的图层进入历史，而不是绕开画布状态。
- 当前阶段暂不引入 LangGraph；只有当语义规划、生图、图片编辑、重试、澄清和恢复形成多节点长流程时，才作为独立架构 PR 评估。

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
画一个园
回到最初状态
重新来
画一座房子，有红色屋顶、黄色墙体、两个窗户和一扇门
画一只蓝色的鸟
把这只鸟换成红色
换成水彩风格
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
