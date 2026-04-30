## Context

当前仅在 `tickets` 表中通过 `status` 和 `updatedAt` 反映最新状态，无变更历史。调度者指派后无法纠正。需要一张 `ticket_history` 表记录每一次操作，同时为 Dashboard 统计提供数据基础。

## Goals / Non-Goals

**Goals:**
- 所有工单状态变更自动写入 `ticket_history`，不可跳过
- assign 端点支持重新指派：`submitted` 或 `assigned` 状态均可改 assignee
- `GET /api/tickets/:id/history` 返回按时间升序的完整操作记录
- 迁移回填已有工单的 `created` 事件

**Non-Goals:**
- 不在此 change 实现 Dashboard 统计 API（那是 mvp1-dashboard）
- 不实现工单评论/备注
- 不实现批量操作
- 不添加 history 分页（数据量小时全量返回）

## Decisions

### 1. Schema：`ticket_history` 表设计

| DB 列名 | JS 属性 | 类型 | 说明 |
|---------|---------|------|------|
| `id` | `id` | text PK | UUID |
| `ticket_id` | `ticketId` | text NOT NULL | FK → tickets.id |
| `action` | `action` | text NOT NULL | `created` / `assigned` / `reassigned` / `started` / `completed` |
| `actor` | `actor` | text NOT NULL | 操作者 username |
| `from_status` | `fromStatus` | text | 变更前状态，`created` 时为 NULL |
| `to_status` | `toStatus` | text NOT NULL | 变更后状态 |
| `details` | `details` | text | JSON：`{ "assignee"?, "prevAssignee"? }` |
| `created_at` | `createdAt` | text NOT NULL | ISO 8601 |

索引（两条，各一个迁移文件）：
- `(ticket_id, created_at)` — 时间线查询
- `(action, created_at)` — Dashboard 聚合

**理由**：与 ROADMAP 设计一致。`details` 存 JSON 字符串（SQLite 无原生 JSON 类型），未来 Dashboard 用 `json_extract` 查询。

### 2. History 写入：路由内直接 insert

**选择**：在每个状态变更端点中，与 ticket update 一起调用 `db.insert(ticketHistory).values(...)`。不抽象 helper 函数，保持直接可读。

**替代方案**：Hono 中间件拦截所有 write → 太隐式，不同 action 的 details 构造不同，中间件无法感知。

**理由**：5 个端点各自构造不同的 `action`/`from_status`/`details`，内联更清晰。

### 3. 重新指派逻辑

**选择**：`PATCH /api/tickets/:id/assign` 接受 `submitted` 和 `assigned` 两种状态：
- `submitted` → `assigned`：action=`assigned`，details=`{ "assignee": "<new>" }`
- `assigned` → `assigned`（assignee 不同）：action=`reassigned`，details=`{ "assignee": "<new>", "prevAssignee": "<old>" }`，仅更新 `assignedTo`
- `assigned` 且 assignee 相同：返回 400 `"工单已指派给该用户"`

**理由**：无需新端点，语义清晰。`reassigned` 独立 action 便于 Dashboard 统计重新指派频率。

### 4. 迁移策略

4 个迁移文件，每个一条 SQL：

| 文件 | 内容 |
|------|------|
| `0006_create_ticket_history.sql` | `CREATE TABLE IF NOT EXISTS ticket_history (...)` |
| `0007_ticket_history_ticket_idx.sql` | `CREATE INDEX IF NOT EXISTS ... ON ticket_history(ticket_id, created_at)` |
| `0008_ticket_history_action_idx.sql` | `CREATE INDEX IF NOT EXISTS ... ON ticket_history(action, created_at)` |
| `0009_backfill_ticket_history.sql` | `INSERT OR IGNORE INTO ticket_history (...) SELECT ... FROM tickets` |

回填为已有工单生成 `created` 事件，`actor` 取 `created_by`，`created_at` 取工单的 `created_at`。

### 5. 共享类型：`TicketHistoryEvent`

```typescript
export type TicketHistoryAction = 'created' | 'assigned' | 'reassigned' | 'started' | 'completed'

export interface TicketHistoryEvent {
  id: string
  ticketId: string
  action: TicketHistoryAction
  actor: string
  fromStatus: string | null
  toStatus: string
  details: string | null  // JSON string
  createdAt: string
}
```

### 6. Dispatcher 工作台 reassign UI

`assigned` 状态工单操作列从纯文本 "已指派给 {assignedTo}" 变为仍显示指派 Select + 按钮，允许重新指派。WF-004 的 assigned 状态 UI 行为变更。

## Directory Layout

```
apps/server/
├── src/db/
│   └── schema.ts                    # +ticketHistory 表 Drizzle 定义
├── src/routes/
│   └── tickets.ts                   # 所有变更端点 +insertHistory；assign 扩展；+GET /:id/history
├── drizzle/
│   ├── 0006_create_ticket_history.sql
│   ├── 0007_ticket_history_ticket_idx.sql
│   ├── 0008_ticket_history_action_idx.sql
│   └── 0009_backfill_ticket_history.sql
└── src/__tests__/
    └── tickets.test.ts              # +history 写入验证、reassign、history API 测试

packages/shared/src/
└── ticket-types.ts                  # +TicketHistoryAction, +TicketHistoryEvent

apps/web/src/
├── api/
│   └── client.ts                    # +getTicketHistory()
├── pages/
│   └── DispatcherWorkbench.tsx      # assigned 状态 → 显示 reassign 操作
└── __tests__/
    └── workbench.test.tsx           # +reassign UI 测试
```

## Risks / Trade-offs

- [迁移回填使用原始 SQL INSERT...SELECT] → 单条语句，符合迁移规范；若未来换 PostgreSQL，仅需改迁移文件
- [details JSON 字符串非结构化] → SQLite 无 JSON 列，Dashboard 用 `json_extract`，切换到 PostgreSQL 后可用 `->>` 等价替代
- [history 表持续增长] → MVP 阶段数据量极小，不设清理策略；MVP2 可评估归档

## Open Questions

1. **History 是否需要分页？** — 当前全量返回。单工单 history 条目通常 < 20 条，MVP 阶段无性能问题
2. **`completed` 后是否还能 reassign？** — 当前设计不允许（assign 仅接受 submitted/assigned）。completed 工单不可重新指派是合理约束，若未来需重开工单再议
3. **删除工单时 history 如何处理？** — 当前无删除工单功能。若未来添加，需 CASCADE 或软删除
