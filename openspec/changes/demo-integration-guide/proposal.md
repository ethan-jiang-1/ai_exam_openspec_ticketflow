## Why

三个工作台已实现，但工单列表中状态和时间的显示是原始文本（如 `submitted`、`2026-01-01T00:00:00Z`），可读性差。同时缺少端到端的集成测试验证完整流转路径，也没有演示说明让新人能快速跑通 Demo。

## What Changes

- 工单列表中状态字段改为带颜色的 Status badge（submitted=蓝、assigned=黄、in_progress=橙、completed=绿）
- 工单列表中时间字段改为本地化格式（如 `2026/1/1 08:00`）
- 新增集成测试：通过 API 测试完整工单流转（create → assign → start → complete），验证状态正确变迁
- 在 README.md 的 Demo Roadmap 区域增加"2 分钟演示步骤"章节

## Capabilities

### New Capabilities

- `demo-guide`: 集成测试 + 演示说明 — 覆盖完整工单流转的自动化验证和面向新人的演示引导

### Modified Capabilities

- `workflow`: 增加 Status badge 样式和时间格式化需求（WF-009, WF-010）

## Impact

- `apps/web/src/App.css` — 新增 status badge 样式
- `apps/web/src/pages/SubmitterWorkbench.tsx` — 使用 Status badge 组件和时间格式化
- `apps/web/src/pages/DispatcherWorkbench.tsx` — 同上
- `apps/web/src/pages/CompleterWorkbench.tsx` — 同上
- `apps/server/src/__tests__/integration.test.ts` — 新增集成测试
- `README.md` — 新增演示步骤章节

## Success Criteria

- `pnpm -w run check` 全部通过（含新增集成测试）
- 工单列表中状态显示为带颜色的 badge，时间显示为本地化格式
- 陌生人按 README 演示步骤可在 2 分钟内跑通完整 Demo 流程
