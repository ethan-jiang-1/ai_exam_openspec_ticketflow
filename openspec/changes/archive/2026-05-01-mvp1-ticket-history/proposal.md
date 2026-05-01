## Why

当前系统无操作审计——谁、何时、做了什么状态变更完全没有记录。调度者也只能在 `submitted` 状态下指派一次，无法纠正错误指派。MVP1 需要 ticket_history 表同时支撑操作时间线和 Dashboard 统计分析。

## What Changes

- 新增 `ticket_history` 表（Drizzle schema + SQLite 迁移，幂等）
- 迁移回填已有工单的 `created` 历史事件
- 5 个状态变更端点全部写入 ticket_history：创建工单 → `created`、指派 → `assigned`、重新指派 → `reassigned`、开始处理 → `started`、完成 → `completed`
- **重新指派**：assign 端点扩展为接受 `submitted` 和 `assigned` 两种状态。`assigned` 状态下改 assignee 产生 `reassigned` 记录，details JSON 含 `prevAssignee`
- `GET /api/tickets/:id/history` 返回按时间升序的操作时间线
- `packages/shared` 新增 `TicketHistoryEvent` 类型

## Capabilities

### Modified Capabilities

- `ticket`: 新增 ticket_history schema + 迁移 (TKT-001)、assign 端点扩展支持重新指派 (TKT-004)、新增 history API (TKT-017)
- `workflow`: 调度者工作台对 assigned 状态工单提供重新指派操作 (WF-004)

## Impact

| 层级 | 文件 | 变更 |
|------|------|------|
| 后端 schema | `apps/server/src/db/schema.ts` | 新增 `ticketHistory` 表定义 |
| 迁移 | `apps/server/drizzle/0006_ticket_history.sql` | CREATE TABLE IF NOT EXISTS + 索引 + 回填 |
| 后端路由 | `apps/server/src/routes/tickets.ts` | 所有状态变更端点写入 history；assign 扩展支持 reassign |
| 后端路由 | `apps/server/src/routes/tickets.ts` | 新增 `GET /api/tickets/:id/history` |
| 共享类型 | `packages/shared/src/ticket-types.ts` | 新增 `TicketHistoryEvent` 类型 + action 字面量 |
| 前端 API | `apps/web/src/api/client.ts` | 新增 `getTicketHistory()` |
| 前端工作台 | `apps/web/src/pages/DispatcherWorkbench.tsx` | assigned 状态工单显示重新指派入口 |
| 测试 | `apps/server/src/__tests__/tickets.test.ts` | 新增 history 写入 + reassign + history API 测试 |
| 测试 | `apps/web/src/__tests__/workbench.test.tsx` | 新增 reassign UI 测试 |
