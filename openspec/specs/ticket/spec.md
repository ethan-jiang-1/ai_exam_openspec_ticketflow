# ticket Specification

## Purpose
工单数据模型定义与 CRUD API 规范。
## Requirements

### Requirement: TKT-001 Tickets 表定义

`apps/server/src/db/schema.ts` SHALL 定义 `tickets` 表，包含以下列：`id` (text, primary key)、`title` (text, not null)、`description` (text, not null)、`status` (text, not null, 默认 `"submitted"`)、`created_by` (text, not null)、`assigned_to` (text, nullable)、`created_at` (text, not null)、`updated_at` (text, not null)。列名使用 snake_case，通过 Drizzle 映射到 JS 侧 camelCase 属性名。

#### Scenario: Schema 编译通过

- **WHEN** 在 `apps/server` 中执行 `npx tsc --noEmit`
- **THEN** 编译 SHALL 通过，`schema.ts` 中 `tickets` 表定义无类型错误

#### Scenario: Schema 与 Ticket interface 字段对齐

- **WHEN** 从 `schema.ts` 导出 `tickets` 表的 `InferSelectModel`
- **THEN** 推导出的类型 SHALL 包含 `id`、`title`、`description`、`status`、`createdBy`（映射自 `created_by`）、`assignedTo`（映射自 `assigned_to`，nullable）、`createdAt`（映射自 `created_at`）、`updatedAt`（映射自 `updated_at`）字段

#### Scenario: 迁移成功执行

- **WHEN** 运行 `pnpm db:migrate`
- **THEN** 命令 SHALL 退出码为 0，`data/ticketflow.db` 中创建 `tickets` 表

### Requirement: TKT-002 创建工单 API

`POST /api/tickets` SHALL 接受 JSON body `{title: string, description: string, createdBy: string}`，创建一条状态为 `"submitted"` 的工单，返回 `201` 状态码和完整的 `Ticket` 对象。`id` SHALL 由 `crypto.randomUUID()` 生成。

#### Scenario: 成功创建工单

- **WHEN** 发送 `POST /api/tickets`，body 为 `{"title":"Fix bug","description":"Login fails","createdBy":"alice"}`
- **THEN** 响应状态码 SHALL 为 `201`，响应体 SHALL 包含 `id`（UUID v4 格式 string）、`status: "submitted"`、`assignedTo: null`、`createdBy: "alice"`、`createdAt` 和 `updatedAt` 为 ISO 8601 格式字符串（且两者初始值相同）

#### Scenario: title 为空时拒绝创建

- **WHEN** 发送 `POST /api/tickets`，body 为 `{"title":"","description":"...","createdBy":"alice"}`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: createdBy 为空时拒绝创建

- **WHEN** 发送 `POST /api/tickets`，body 为 `{"title":"Fix bug","description":"...","createdBy":""}`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

### Requirement: TKT-003 查询工单 API

`GET /api/tickets` SHALL 返回所有工单列表（`200`，`Ticket[]`）。`GET /api/tickets/:id` SHALL 返回指定 ID 的工单（`200`，`Ticket`）或 `404`。

#### Scenario: 列出所有工单

- **WHEN** 发送 `GET /api/tickets`，且数据库中有 2 条工单
- **THEN** 响应状态码 SHALL 为 `200`，响应体 SHALL 为长度为 2 的数组

#### Scenario: 按 ID 获取工单

- **WHEN** 发送 `GET /api/tickets/:id`，其中 `:id` 为已存在的工单 ID
- **THEN** 响应状态码 SHALL 为 `200`，响应体 SHALL 包含该工单的完整字段

#### Scenario: ID 不存在返回 404

- **WHEN** 发送 `GET /api/tickets/non-existent-id`
- **THEN** 响应状态码 SHALL 为 `404`，响应体 SHALL 为 `{ error: string }` 格式

### Requirement: TKT-004 工单指派 API

`PATCH /api/tickets/:id/assign` SHALL 接受 JSON body `{assignedTo: string}`，将工单状态从 `"submitted"` 变更为 `"assigned"`，设置 `assignedTo` 字段，并更新 `updatedAt` 为当前时间。

#### Scenario: 成功指派

- **WHEN** 工单状态为 `"submitted"`，发送 `PATCH /api/tickets/:id/assign`，body 为 `{"assignedTo":"bob"}`
- **THEN** 响应状态码 SHALL 为 `200`，`status` SHALL 为 `"assigned"`，`assignedTo` SHALL 为 `"bob"`，`updatedAt` SHALL 晚于 `createdAt`

#### Scenario: 非 submitted 状态拒绝指派

- **WHEN** 工单状态为 `"assigned"`，发送 `PATCH /api/tickets/:id/assign`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: 工单不存在时返回 404

- **WHEN** 发送 `PATCH /api/tickets/non-existent-id/assign`
- **THEN** 响应状态码 SHALL 为 `404`

### Requirement: TKT-005 工单开始处理 API

`PATCH /api/tickets/:id/start` SHALL 将工单状态从 `"assigned"` 变更为 `"in_progress"`，并更新 `updatedAt` 为当前时间。

#### Scenario: 成功开始处理

- **WHEN** 工单状态为 `"assigned"`，发送 `PATCH /api/tickets/:id/start`
- **THEN** 响应状态码 SHALL 为 `200`，`status` SHALL 为 `"in_progress"`，`updatedAt` SHALL 晚于操作前的值

#### Scenario: 非 assigned 状态拒绝开始

- **WHEN** 工单状态为 `"submitted"`，发送 `PATCH /api/tickets/:id/start`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: 工单不存在时返回 404

- **WHEN** 发送 `PATCH /api/tickets/non-existent-id/start`
- **THEN** 响应状态码 SHALL 为 `404`

### Requirement: TKT-006 工单完成 API

`PATCH /api/tickets/:id/complete` SHALL 将工单状态从 `"in_progress"` 变更为 `"completed"`，并更新 `updatedAt` 为当前时间。

#### Scenario: 成功完成

- **WHEN** 工单状态为 `"in_progress"`，发送 `PATCH /api/tickets/:id/complete`
- **THEN** 响应状态码 SHALL 为 `200`，`status` SHALL 为 `"completed"`，`updatedAt` SHALL 晚于操作前的值

#### Scenario: 非 in_progress 状态拒绝完成

- **WHEN** 工单状态为 `"assigned"`，发送 `PATCH /api/tickets/:id/complete`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: 工单不存在时返回 404

- **WHEN** 发送 `PATCH /api/tickets/non-existent-id/complete`
- **THEN** 响应状态码 SHALL 为 `404`

### Requirement: TKT-007 路由挂载

tickets 路由 SHALL 在 `apps/server/src/app.ts` 中以 `/api/tickets` 前缀挂载。

#### Scenario: 路由可访问

- **WHEN** 服务器启动后，发送 `GET /api/tickets`
- **THEN** 响应状态码 SHALL 为 `200`（非 404）
