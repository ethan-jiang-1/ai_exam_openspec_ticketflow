# ticket Specification

## Purpose
工单数据模型定义与 CRUD API 规范。
## Requirements

### Requirement: TKT-001 Tickets 表定义

`apps/server/src/db/schema.ts` SHALL 定义 `tickets` 表，包含以下列：`id` (text, primary key)、`title` (text, not null)、`description` (text, not null)、`status` (text, not null, 默认 `"submitted"`)、`priority` (text, not null, 默认 `"medium"`)、`due_date` (text, nullable)、`created_by` (text, not null)、`assigned_to` (text, nullable)、`created_at` (text, not null)、`updated_at` (text, not null)。列名使用 snake_case，通过 Drizzle 映射到 JS 侧 camelCase 属性名。

#### Scenario: Schema 编译通过

- **WHEN** 在 `apps/server` 中执行 `npx tsc --noEmit`
- **THEN** 编译 SHALL 通过，`schema.ts` 中 `tickets` 表定义无类型错误

#### Scenario: Schema 与 Ticket interface 字段对齐

- **WHEN** 从 `schema.ts` 导出 `tickets` 表的 `InferSelectModel`
- **THEN** 推导出的类型 SHALL 包含 `id`、`title`、`description`、`status`、`priority`、`dueDate`（映射自 `due_date`，nullable）、`createdBy`（映射自 `created_by`）、`assignedTo`（映射自 `assigned_to`，nullable）、`createdAt`（映射自 `created_at`）、`updatedAt`（映射自 `updated_at`）字段

#### Scenario: 迁移成功执行

- **WHEN** 运行 `pnpm db:migrate`
- **THEN** 命令 SHALL 退出码为 0，`data/ticketflow.db` 中创建 `tickets` 表

### Requirement: TKT-002 创建工单 API

`POST /api/tickets` SHALL 接受 JSON body `{title: string, description: string, priority?: string, dueDate?: string}`，创建一条状态为 `"submitted"` 的工单。`priority` 缺省时默认 `"medium"`，`dueDate` 缺省时为 `null`。`id` SHALL 由 `crypto.randomUUID()` 生成。`createdBy` SHALL 从当前登录用户的 session 获取。

#### Scenario: 成功创建工单（含新字段）

- **WHEN** 发送 `POST /api/tickets`，body 为 `{ "title": "Fix bug", "description": "Login fails", "priority": "high", "dueDate": "2026-06-01" }`
- **THEN** 响应状态码 SHALL 为 `201`，响应体 SHALL 包含 `status: "submitted"`、`priority: "high"`、`dueDate: "2026-06-01"`、`createdBy` 为当前登录用户 username

#### Scenario: title 为空时拒绝创建

- **WHEN** 发送 `POST /api/tickets`，body 为 `{ "title": "", "description": "..." }`
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

### Requirement: TKT-008 Priority 类型定义

`packages/shared` SHALL 定义 `Priority` 类型为 `'low' | 'medium' | 'high'` 字面量联合类型，以及 `PRIORITIES` 常量对象 `{ LOW: 'low', MEDIUM: 'medium', HIGH: 'high' }`、`PRIORITY_ORDER` 映射 `{ low: 0, medium: 1, high: 2 }` 和 `PRIORITY_LABELS` 映射 `{ low: '低', medium: '中', high: '高' }`。`Ticket` interface SHALL 新增 `priority: Priority` 字段。

#### Scenario: Priority 类型完整性

- **WHEN** 检查 `PRIORITIES` 对象的所有值
- **THEN** 包含且仅包含 `'low'`、`'medium'`、`'high'` 三个字符串

#### Scenario: PRIORITY_ORDER 排序权重

- **WHEN** 比较 `PRIORITY_ORDER['high']` 与 `PRIORITY_ORDER['low']`
- **THEN** `PRIORITY_ORDER['high']` > `PRIORITY_ORDER['low']`（high 权重大于 low）

#### Scenario: PRIORITY_LABELS 中文标签

- **WHEN** 查询 `PRIORITY_LABELS['high']`、`PRIORITY_LABELS['medium']`、`PRIORITY_LABELS['low']`
- **THEN** 分别返回 `'高'`、`'中'`、`'低'`

### Requirement: TKT-009 DueDate 字段定义

`Ticket` interface SHALL 新增 `dueDate: string | null` 字段。DB 列名 `due_date`（text, nullable），映射到 JS 属性 `dueDate`。

#### Scenario: Ticket 类型包含 dueDate

- **WHEN** 检查 `Ticket` interface 的字段列表
- **THEN** 包含 `dueDate: string | null` 字段

#### Scenario: 未设置 dueDate 时为 null

- **WHEN** 创建工单时不传入 `dueDate` 参数
- **THEN** 返回的工单对象 `dueDate` 字段为 `null`

### Requirement: TKT-010 Tickets 表新增列

`apps/server/src/db/schema.ts` 的 `tickets` 表 SHALL 新增 `priority` 列（text, not null, default `'medium'`）和 `due_date` 列（text, nullable）。

#### Scenario: 迁移成功执行

- **WHEN** 运行数据库迁移
- **THEN** tickets 表新增 `priority` 和 `due_date` 列，迁移退出码为 0

#### Scenario: 旧数据优先级默认值

- **WHEN** 迁移前已存在的工单记录
- **THEN** 其 `priority` 列值为 `'medium'`，`due_date` 列值为 `null`

### Requirement: TKT-011 创建工单接受 priority 和 dueDate

`POST /api/tickets` SHALL 接受可选的 `priority`（string）和 `dueDate`（string, `YYYY-MM-DD` 格式）参数。`priority` 为空时默认 `'medium'`。`priority` 非法值（不在 low/medium/high 中）SHALL 返回 `400` `{ error: string }`。`dueDate` 格式非法（无法解析为有效日期）SHALL 返回 `400` `{ error: string }`。

#### Scenario: 带全部新字段创建工单

- **WHEN** 发送 `POST /api/tickets`，body 为 `{ "title": "Bug", "description": "...", "priority": "high", "dueDate": "2026-05-30" }`
- **THEN** 响应状态码 SHALL 为 `201`，响应体 `priority` 为 `"high"`，`dueDate` 为 `"2026-05-30"`

#### Scenario: 不传新字段使用默认值

- **WHEN** 发送 `POST /api/tickets`，body 为 `{ "title": "Bug", "description": "..." }`（无 priority 和 dueDate）
- **THEN** 响应状态码 SHALL 为 `201`，响应体 `priority` 为 `"medium"`，`dueDate` 为 `null`

#### Scenario: priority 非法值返回 400

- **WHEN** 发送 `POST /api/tickets`，body 为 `{ "title": "Bug", "description": "...", "priority": "urgent" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式，错误信息包含 "priority" 关键字

#### Scenario: dueDate 格式非法返回 400

- **WHEN** 发送 `POST /api/tickets`，body 为 `{ "title": "Bug", "description": "...", "dueDate": "not-a-date" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式，错误信息包含 "dueDate" 关键字

### Requirement: TKT-012 指派校验用户存在性

`PATCH /api/tickets/:id/assign` SHALL 校验 `assignedTo` 字段值为 users 表中已存在的 username。当 `assignedTo` 对应的用户不存在时，SHALL 返回 `400` `{ error: '指派目标用户不存在' }`。

#### Scenario: 指派给存在的用户成功

- **WHEN** users 表存在 username 为 `"completer"` 的用户，发送 `PATCH /api/tickets/:id/assign`，body 为 `{ "assignedTo": "completer" }`
- **THEN** 响应状态码 SHALL 为 `200`，`assignedTo` 为 `"completer"`

#### Scenario: 指派给不存在的用户返回 400

- **WHEN** users 表不存在 username 为 `"nobody"` 的用户，发送 `PATCH /api/tickets/:id/assign`，body 为 `{ "assignedTo": "nobody" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ "error": "指派目标用户不存在" }`

### Requirement: TKT-013 Dispatcher 工作台优先级排序

Dispatcher 工作台 SHALL 将待指派工单按 priority 降序排列（high → medium → low）。数据来源为 `GET /api/tickets` 返回的全量数据，过滤条件为 `status !== 'completed'`，排序在客户端执行。

#### Scenario: 高优先级工单排在前面

- **WHEN** Dispatcher 工作台加载，存在 priority 为 high、medium、low 的待指派工单各一条
- **THEN** 列表中工单顺序 SHALL 为 high → medium → low

#### Scenario: 相同优先级保持原有顺序

- **WHEN** 存在两条 priority 均为 `'medium'` 的待指派工单
- **THEN** 两者相对顺序 SHALL 保持 API 返回顺序（稳定排序）

### Requirement: TKT-014 Assignee 下拉选择

Dispatcher 工作台指派操作的 `assignedTo` 字段 SHALL 使用 antd Select 组件，选项来自 `GET /api/auth/users` 返回的用户列表，仅显示 `role === 'completer'` 的用户。数据来源为 `GET /api/auth/users`，过滤条件为 `role === 'completer'`，过滤在客户端执行。

#### Scenario: 下拉框显示 completer 用户

- **WHEN** Dispatcher 工作台加载，`GET /api/auth/users` 返回包含 submitter、dispatcher、completer 三个用户
- **THEN** 指派下拉框 SHALL 仅显示 completer 用户的选项

#### Scenario: 下拉框为空时的提示

- **WHEN** `GET /api/auth/users` 返回的用户中没有 role 为 completer 的用户
- **THEN** 下拉框 SHALL 显示为空，用户无法选择指派目标

### Requirement: TKT-015 工单详情展示 priority 和 dueDate

三个工作台的工单详情 Drawer SHALL 展示 `priority` 字段为 antd Tag（颜色区分：high=red, medium=orange, low=blue，文本使用 `PRIORITY_LABELS` 中文标签），展示 `dueDate` 字段。当 `dueDate` 为当天或已过期时，SHALL 以红色文字显示并附带"已到期"或"今日到期"标签。

#### Scenario: 显示优先级 Tag

- **WHEN** 工单 priority 为 `"high"`
- **THEN** Drawer 中 SHALL 显示红色 Tag，文本为"高"

#### Scenario: 显示未过期 dueDate

- **WHEN** 工单 dueDate 为未来的日期
- **THEN** Drawer 中 SHALL 正常显示日期文本

#### Scenario: 显示已到期警告

- **WHEN** 工单 dueDate 为过去的日期
- **THEN** Drawer 中 SHALL 以红色文字显示日期，并附带"已到期"标签

### Requirement: TKT-016 工作台表格 priority 列

三个工作台（Submitter、Dispatcher、Completer）的工单表格 SHALL 包含 priority 列，显示为 antd Tag（颜色区分：high=red, medium=orange, low=blue，文本使用 `PRIORITY_LABELS` 中文标签）。

#### Scenario: 表格显示 priority 列

- **WHEN** 工单列表中存在 priority 为 `"high"` 的工单
- **THEN** 表格 priority 列 SHALL 显示红色 Tag，文本为"高"

#### Scenario: priority 列位置

- **WHEN** 查看任一工作台的工单表格列
- **THEN** priority 列 SHALL 出现在 status 列之前或之后（紧邻位置）
