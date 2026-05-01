## Why

当前三个工作台 Table 使用 `pagination={false}` 全量加载，工单超 100 条时页面卡顿。用户无法按状态筛选，只能看到程序化过滤后的全部结果。此外 mvp1-ticket-history 已提供 `GET /api/tickets/:id/history` API，但前端尚未消费——提交者看不到工单处理时间线。

## What Changes

- 三个工作台 Table 启用 antd 内置前端分页（默认 pageSize=10，支持 showSizeChanger）
- 三个工作台 Table 添加状态列筛选（antd Table column `filters`），允许用户按 submitted/assigned/in_progress/completed 过滤
- 抽取共享 `TicketDetailDrawer` 组件（含 antd `Timeline` 展示工单处理历史），替换三个工作台中重复的 Drawer 实现
- 提交者工作台工单详情展示完整处理时间线（调用 `getTicketHistory`，基于 ticket_history 数据）

## Capabilities

### New Capabilities

(none — this change enhances existing workbench and ticket display)

### Modified Capabilities

- `workflow`: WF-003/4/5 工作台 Table 增加前端分页和状态列筛选
- `ticket`: 新增共享 TicketDetailDrawer 组件（含 Timeline），三个工作台统一使用

## Impact

| 文件 | 变更 |
|------|------|
| `apps/web/src/components/TicketDetailDrawer.tsx` | **新增** 共享抽屉组件（含 Timeline） |
| `apps/web/src/components/Timeline.tsx` | **新增** Timeline 组件（antd Timeline + ticket_history 数据） |
| `apps/web/src/pages/SubmitterWorkbench.tsx` | 删除内联 Drawer，改用共享组件；Table 加分页 + 状态筛选 |
| `apps/web/src/pages/DispatcherWorkbench.tsx` | 同上 |
| `apps/web/src/pages/CompleterWorkbench.tsx` | 同上 |
| `apps/web/src/api/client.ts` | 已存在 `getTicketHistory`（mvp1-ticket-history 提供） |
| `openspec/specs/workflow/spec.md` | WF-003/4/5 |
| `openspec/specs/ticket/spec.md` | 新增 Timeline 和共享 Drawer 相关 Requirement |
