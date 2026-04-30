# 依赖关系

Section 3–5 依赖 Section 1（共享类型）和 Section 2（Schema + 迁移）。
Section 6 依赖 Section 3–5（需代码完成才能测试）。
Section 7 依赖 Section 5（History API 端点需实现）。
Section 8–9 依赖 Section 7（需 API client 函数）。

## 1. 共享类型 [TKT-020]

- [ ] 1.1 在 `packages/shared/src/ticket-types.ts` 新增 `TicketHistoryAction` 类型和 `TicketHistoryEvent` 接口 [TKT-020]
- [ ] 1.2 从 `packages/shared/src/index.ts` 导出新类型 [TKT-020]

## 2. 数据库 Schema 与迁移 [TKT-017]

- [ ] 2.1 在 `apps/server/src/db/schema.ts` 新增 `ticketHistory` 表 Drizzle 定义，并更新 `schema` 导出对象包含 `ticketHistory` [TKT-017]
- [ ] 2.2 创建迁移 `0006_create_ticket_history.sql`（`CREATE TABLE IF NOT EXISTS`），并在 `apps/server/drizzle/meta/_journal.json` 追加对应 entry [TKT-017]
- [ ] 2.3 创建迁移 `0007_ticket_history_ticket_idx.sql`（`CREATE INDEX IF NOT EXISTS`），并更新 `_journal.json` [TKT-017]
- [ ] 2.4 创建迁移 `0008_ticket_history_action_idx.sql`（`CREATE INDEX IF NOT EXISTS`），并更新 `_journal.json` [TKT-017]
- [ ] 2.5 创建迁移 `0009_backfill_ticket_history.sql`（`INSERT OR IGNORE INTO ... SELECT ... FROM tickets`），并更新 `_journal.json` [TKT-017]

## 3. 后端 - History 写入 [TKT-018]

- [ ] 3.1 `POST /api/tickets` 创建工单时写入 `created` history 记录（fromStatus=null, toStatus=submitted）[TKT-018]
- [ ] 3.2 `PATCH /api/tickets/:id/assign` 指派/重新指派时写入 `assigned`（fromStatus=submitted）或 `reassigned`（fromStatus=assigned, toStatus=assigned）history 记录 [TKT-018]
- [ ] 3.3 `PATCH /api/tickets/:id/start` 开始处理时写入 `started` history 记录 [TKT-018]
- [ ] 3.4 `PATCH /api/tickets/:id/complete` 完成工单时写入 `completed` history 记录 [TKT-018]

## 4. 后端 - 重新指派逻辑扩展 [TKT-004]

- [ ] 4.1 扩展 assign 端点接受 `submitted` 和 `assigned` 两种状态 [TKT-004]
- [ ] 4.2 `assigned` 状态指派给不同人时产生 `reassigned` 记录（details 含 `prevAssignee`）[TKT-004]
- [ ] 4.3 `assigned` 状态指派给相同人时返回 400 `"工单已指派给该用户"` [TKT-004]

## 5. 后端 - History API [TKT-019]

- [ ] 5.1 新增 `GET /api/tickets/:id/history` 端点（在 `ticketsRoute` 上定义，`app.ts` 已挂载 `ticketsRoute` 于 `/api/tickets`，无需修改 app.ts），按 `createdAt` 升序返回 [TKT-019]

## 6. 后端测试

- [ ] 6.1 测试 `ticketHistory` 表迁移成功执行，重复迁移幂等 [TKT-017]
- [ ] 6.2 测试所有 5 个端点正确写入 history 记录（action/actor/fromStatus/toStatus/details）[TKT-018]
- [ ] 6.3 测试操作失败时不写入 history [TKT-018]
- [ ] 6.4 测试首次指派（submitted→assigned）产生 `assigned` history，fromStatus 为 `submitted` [TKT-004]
- [ ] 6.5 测试重新指派（assigned→assigned，不同人）产生 `reassigned` history。测试需 seed 第二个 completer 用户（如 `completer2`）[TKT-004]
- [ ] 6.6 测试指派给相同用户返回 400 [TKT-004]
- [ ] 6.7 测试非 submitted/assigned 状态拒绝指派 [TKT-004]
- [ ] 6.8 测试 `GET /api/tickets/:id/history` 返回完整时间线（含 created→assigned→started→completed 及空数组场景）[TKT-019]
- [ ] 6.9 测试工单不存在时返回 404 [TKT-019]
- [ ] 6.10 测试未登录访问返回 401。需在 auth guard 端点列表中新增 `GET /api/tickets/some-id/history` [TKT-019]

## 7. 前端 API Client

- [ ] 7.1 在 `apps/web/src/api/client.ts` 新增 `getTicketHistory()` 函数 [TKT-019]

## 8. 前端 - 调度者工作台重新指派 UI [WF-004]

- [ ] 8.1 `assigned` 状态工单操作列改为显示指派 Select + "重新指派" Button [WF-004]
- [ ] 8.2 重新指派给相同用户时显示错误提示 [WF-004]

## 9. 前端测试 [WF-004]

- [ ] 9.1 测试 assigned 状态工单显示重新指派 Select 和 Button [WF-004]
- [ ] 9.2 测试重新指派成功后列表刷新。mock 的 `getUsers` 返回需包含第二个 completer（如 `completer2`）以供 Select 选择 [WF-004]
- [ ] 9.3 测试重新指派给相同用户时显示错误提示 [WF-004]
