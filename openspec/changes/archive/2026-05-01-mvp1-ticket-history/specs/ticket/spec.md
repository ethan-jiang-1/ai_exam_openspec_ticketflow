## MODIFIED Requirements

### Requirement: TKT-004 工单指派 API

`PATCH /api/tickets/:id/assign` SHALL 接受 JSON body `{assignedTo: string}`。

当工单状态为 `submitted` 时：SHALL 将状态变更为 `assigned`，设置 `assignedTo`，写入 `ticket_history`（action=`assigned`，from_status=`submitted`，to_status=`assigned`，details=`{"assignee":"<new>"}`）。

当工单状态为 `assigned` 且 `assignedTo` 与新值不同时（重新指派）：SHALL 保持状态为 `assigned`，仅更新 `assignedTo`，写入 `ticket_history`（action=`reassigned`，from_status=`assigned`，to_status=`assigned`，details=`{"assignee":"<new>","prevAssignee":"<old>"}`）。

当工单状态为 `assigned` 且 `assignedTo` 与新值相同时：SHALL 返回 400 `{ error: "工单已指派给该用户" }`。

当工单状态既非 `submitted` 也非 `assigned` 时：SHALL 返回 400 `{ error: "Cannot assign ticket in status \"<status>\"" }`。

SHALL 校验 `assignedTo` 字段值为 users 表中已存在的 username。工单不存在时 SHALL 返回 404。

#### Scenario: 成功指派（submitted → assigned）

- **WHEN** 工单状态为 `submitted`，发送 `PATCH /api/tickets/:id/assign`，body 为 `{"assignedTo":"completer"}`
- **THEN** 响应状态码 SHALL 为 `200`，`status` SHALL 为 `assigned`，`assignedTo` SHALL 为 `completer`，ticket_history 中 SHALL 包含一条 action=`assigned` 的记录

#### Scenario: 重新指派（assigned → assigned，不同人）

- **WHEN** 工单状态为 `assigned`，assignedTo 为 `completer`，发送 `PATCH /api/tickets/:id/assign`，body 为 `{"assignedTo":"completer2"}`
- **THEN** 响应状态码 SHALL 为 `200`，`status` SHALL 保持 `assigned`，`assignedTo` SHALL 变为 `completer2`，ticket_history 中 SHALL 包含一条 action=`reassigned` 的记录，details SHALL 包含 `prevAssignee: "completer"`

#### Scenario: 指派给相同用户返回 400

- **WHEN** 工单状态为 `assigned`，assignedTo 为 `completer`，发送 `PATCH /api/tickets/:id/assign`，body 为 `{"assignedTo":"completer"}`
- **THEN** 响应状态码 SHALL 为 `400`，body 为 `{ error: "工单已指派给该用户" }`

#### Scenario: 非 submitted/assigned 状态拒绝指派

- **WHEN** 工单状态为 `in_progress`，发送 `PATCH /api/tickets/:id/assign`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: 工单不存在时返回 404

- **WHEN** 发送 `PATCH /api/tickets/non-existent-id/assign`
- **THEN** 响应状态码 SHALL 为 `404`

#### Scenario: 指派目标用户不存在返回 400

- **WHEN** users 表不存在 username 为 `nobody` 的用户，发送 `PATCH /api/tickets/:id/assign`，body 为 `{ "assignedTo": "nobody" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ "error": "指派目标用户不存在" }`

## ADDED Requirements

### Requirement: TKT-022 ticket_history 表定义

`apps/server/src/db/schema.ts` SHALL 定义 `ticketHistory` 表（Drizzle sqliteTable），列映射如下：

| DB 列名 | JS 属性 | 类型 | 约束 |
|---------|---------|------|------|
| `id` | `id` | text | PRIMARY KEY |
| `ticket_id` | `ticketId` | text | NOT NULL |
| `action` | `action` | text | NOT NULL |
| `actor` | `actor` | text | NOT NULL |
| `from_status` | `fromStatus` | text | NULL 仅 action=`created` |
| `to_status` | `toStatus` | text | NOT NULL |
| `details` | `details` | text | JSON 字符串，可 NULL |
| `created_at` | `createdAt` | text | NOT NULL |

`action` SHALL 仅允许 `created`、`assigned`、`reassigned`、`started`、`completed` 五种值。

迁移文件 SHALL 包含：
- `0006_create_ticket_history.sql`：`CREATE TABLE IF NOT EXISTS ticket_history (...)`
- `0007_ticket_history_ticket_idx.sql`：`CREATE INDEX IF NOT EXISTS ... ON ticket_history(ticket_id, created_at)`
- `0008_ticket_history_action_idx.sql`：`CREATE INDEX IF NOT EXISTS ... ON ticket_history(action, created_at)`
- `0009_backfill_ticket_history.sql`：`INSERT OR IGNORE INTO ticket_history (...) SELECT ... FROM tickets` 为所有已有工单回填 `created` 事件

所有 CREATE 迁移 SHALL 使用 `IF NOT EXISTS` 确保幂等性；回填迁移 SHALL 使用 `INSERT OR IGNORE` 确保幂等性。

#### Scenario: 迁移成功执行

- **WHEN** 运行 `pnpm db:migrate`
- **THEN** `ticket_history` 表 SHALL 被创建，两个索引 SHALL 被创建，已有工单 SHALL 各有一条 action=`created` 的 history

#### Scenario: 重复迁移不报错

- **WHEN** 再次运行 `pnpm db:migrate`
- **THEN** 命令 SHALL 退出码为 0，无重复表/索引错误

### Requirement: TKT-023 状态变更写入 History

以下端点 SHALL 在执行状态变更后，通过 Drizzle ORM 向 `ticketHistory` 表插入一条记录：

| 端点 | action | fromStatus | toStatus | details |
|------|--------|-----------|----------|---------|
| `POST /api/tickets` | `created` | null | `submitted` | null |
| `PATCH /api/tickets/:id/assign` (首次) | `assigned` | `submitted` | `assigned` | `{"assignee":"<v>"}` |
| `PATCH /api/tickets/:id/assign` (重指派) | `reassigned` | `assigned` | `assigned` | `{"assignee":"<v>","prevAssignee":"<old>"}` |
| `PATCH /api/tickets/:id/start` | `started` | `assigned` | `in_progress` | null |
| `PATCH /api/tickets/:id/complete` | `completed` | `in_progress` | `completed` | null |

每条记录的 `id` SHALL 由 `crypto.randomUUID()` 生成，`actor` SHALL 从 `c.get('user').username` 获取，`createdAt` SHALL 为 ISO 8601 当前时间。

#### Scenario: 创建工单写入 created 事件

- **WHEN** 发送 `POST /api/tickets` 创建工单成功
- **THEN** `ticketHistory` 表 SHALL 包含一条 `action: "created"`、`actor: "<submitter>"`、`toStatus: "submitted"`、`fromStatus: null` 的记录

#### Scenario: 指派工单写入 assigned 事件

- **WHEN** 发送 `PATCH /api/tickets/:id/assign` 首次指派成功
- **THEN** `ticketHistory` 表 SHALL 包含一条 `action: "assigned"`、`fromStatus: "submitted"`、`toStatus: "assigned"`、details 含 `assignee` 的记录

#### Scenario: 重新指派写入 reassigned 事件

- **WHEN** 发送 `PATCH /api/tickets/:id/assign` 重新指派成功
- **THEN** `ticketHistory` 表 SHALL 包含一条 `action: "reassigned"`、`fromStatus: "assigned"`、`toStatus: "assigned"`、details 含 `prevAssignee` 和 `assignee` 的记录

#### Scenario: 开始处理写入 started 事件

- **WHEN** 发送 `PATCH /api/tickets/:id/start` 成功
- **THEN** `ticketHistory` 表 SHALL 包含一条 `action: "started"`、`fromStatus: "assigned"`、`toStatus: "in_progress"` 的记录

#### Scenario: 完成工单写入 completed 事件

- **WHEN** 发送 `PATCH /api/tickets/:id/complete` 成功
- **THEN** `ticketHistory` 表 SHALL 包含一条 `action: "completed"`、`fromStatus: "in_progress"`、`toStatus: "completed"` 的记录

#### Scenario: 操作失败不写入

- **WHEN** 状态变更端点返回错误（400/404）
- **THEN** `ticketHistory` 表 SHALL NOT 包含对应记录

### Requirement: TKT-024 GET /api/tickets/:id/history

`GET /api/tickets/:id/history` SHALL 返回指定工单的完整操作时间线（`200`，`TicketHistoryEvent[]`），按 `createdAt` 升序排列。此端点 SHALL 要求认证（`requireAuth`）。工单不存在时 SHALL 返回 404。

#### Scenario: 返回完整时间线

- **WHEN** 某工单经历了 created → assigned → started → completed 完整流程，发送 `GET /api/tickets/:id/history`
- **THEN** 响应状态码 SHALL 为 `200`，body SHALL 为长度为 4 的数组，按 `createdAt` 升序，第一条 `action: "created"`，最后一条 `action: "completed"`

#### Scenario: 重新指派包含两条 assign 记录

- **WHEN** 某工单经历了 assigned → reassigned，发送 `GET /api/tickets/:id/history`
- **THEN** 响应 SHALL 包含两条记录：`action: "assigned"` 和 `action: "reassigned"`，reassigned 的 details 含 `prevAssignee`

#### Scenario: 无 history 返回空数组

- **WHEN** 某新工单（刚创建，但 history 被清除的极端情况），发送 `GET /api/tickets/:id/history`
- **THEN** 响应状态码 SHALL 为 `200`，body SHALL 为 `[]`

#### Scenario: 工单不存在返回 404

- **WHEN** 发送 `GET /api/tickets/non-existent-id/history`
- **THEN** 响应状态码 SHALL 为 `404`

#### Scenario: 未登录访问返回 401

- **WHEN** 未携带 session cookie 发送 `GET /api/tickets/:id/history`
- **THEN** 响应状态码 SHALL 为 `401`

### Requirement: TKT-025 TicketHistoryEvent 共享类型

`packages/shared/src/ticket-types.ts` SHALL 导出：

```typescript
export type TicketHistoryAction = 'created' | 'assigned' | 'reassigned' | 'started' | 'completed'

export interface TicketHistoryEvent {
  id: string
  ticketId: string
  action: TicketHistoryAction
  actor: string
  fromStatus: string | null
  toStatus: string
  details: string | null
  createdAt: string
}
```

`packages/shared/src/index.ts` SHALL 通过 `export * from './ticket-types'` 导出此类型。

#### Scenario: 类型前后端可用

- **WHEN** 在 `apps/web` 或 `apps/server` 中 `import type { TicketHistoryEvent } from '@ticketflow/shared'`
- **THEN** SHALL 获得包含 id / ticketId / action / actor / fromStatus / toStatus / details / createdAt 的类型定义
