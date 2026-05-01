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

### Requirement: TKT-017 共享 TicketDetailDrawer 组件

`apps/web/src/components/TicketDetailDrawer.tsx` SHALL 导出 `TicketDetailDrawer` 组件，接受以下 props：

```typescript
interface TicketDetailDrawerProps {
  ticket: Ticket | null
  open: boolean
  onClose: () => void
  showTimeline?: boolean      // 默认 true
  enableComments?: boolean    // 默认 false
  refreshKey?: number         // 默认 0
  onCommentAdded?: () => void // enableComments=true 时由父组件传入
}
```

组件内部 SHALL：
1. 使用 antd `Drawer`（`width={480}`，`title={ticket.title}`）
2. 使用 antd `Descriptions`（`column={1}`、`bordered`、`size="small"`）展示工单详情字段：状态（antd `Tag` + 中文标签）、创建者、指派给、优先级（antd `Tag`）、截止日期、创建时间、描述
3. 当 `showTimeline` 为 `true` 时，调用 `getTicketHistory(ticket.id)` 获取历史数据，通过 `Timeline` 组件渲染处理时间线。useEffect 依赖数组包含 `refreshKey`，父组件通过递增 `refreshKey` 触发 Timeline 重新拉取
4. 当 `enableComments` 为 `true` 时，在 Timeline 之后渲染备注区域：antd `Input.TextArea`（`maxLength={2000}`、`showCount`、`rows={3}`）+ antd `Button` "添加备注"。`addComment` 直接从 `../api/client` 导入。提交成功后清空输入并调用 `onCommentAdded` 回调；API 失败时保留已输入文本并显示错误
5. 当 `getTicketHistory` 失败时，显示 antd `Empty` 组件，描述为 "无法加载处理历史"

#### Scenario: Drawer 展示工单详情

- **WHEN** 传入有效 `ticket` 对象，`open=true`
- **THEN** antd Drawer SHALL 显示工单标题为 title，Descriptions 展示状态（Tag）、创建者、指派给、优先级（Tag）、截止日期、创建时间、描述

#### Scenario: 展示处理时间线

- **WHEN** `showTimeline=true` 且 `getTicketHistory` 返回 2 条记录
- **THEN** Drawer 内 SHALL 渲染 antd Timeline，包含 2 个条目

#### Scenario: 历史加载失败时的降级显示

- **WHEN** `getTicketHistory` API 调用失败
- **THEN** SHALL 显示 antd Empty "无法加载处理历史"，Drawer 其余部分正常显示

#### Scenario: 备注区域条件渲染

- **WHEN** `enableComments=true`
- **THEN** Drawer 底部 SHALL 显示 Input.TextArea 备注输入框和 "添加备注" 按钮

#### Scenario: 备注提交成功刷新 Timeline

- **WHEN** 用户输入备注并点击 "添加备注"，API 返回成功
- **THEN** SHALL 清空输入框，调用 `onCommentAdded` 回调通知父组件递增 refreshKey 以触发 Timeline 刷新

#### Scenario: 备注 API 失败保留已输入文本

- **WHEN** 用户输入备注后提交，但 API 返回错误
- **THEN** 备注输入框中已输入的文本不被清空，并显示 API 错误提示

### Requirement: TKT-018 Timeline 组件

`apps/web/src/components/Timeline.tsx` SHALL 导出 `Timeline` 组件，接受 `events: TicketHistoryEvent[]` prop。

组件内部 SHALL：
1. 使用 antd `Timeline` 组件渲染历史事件列表
2. 每个 `Timeline.Item` SHALL 显示：
   - action 中文标签（映射表：`created` → "创建工单"、`assigned` → "指派"、`reassigned` → "改派"、`started` → "开始处理"、`completed` → "完成"、`edited` → "编辑了{字段}"、`commented` → "添加了备注"）
   - actor（操作人 username）
   - 通过 `new Date(createdAt).toLocaleString()` 格式化的时间戳
3. Timeline item `color` 按 action 类型区分：`created`=blue, `assigned`/`reassigned`=gold, `started`=orange, `completed`=green, `edited`=purple, `commented`=green
4. 当 `details` 不为 null 时，解析 JSON 并在 item 中显示详细信息：
   - `assigned`：含 `{assignee}`，显示指派目标
   - `reassigned`：含 `{assignee, prevAssignee}`，显示指派目标和原处理人
   - `edited`：含 `{field, oldValue, newValue}`，显示 "编辑了{字段中文名}" 及旧值→新值变更
   - `commented`：含 `{comment}`，显示备注文本
   - `created`：含原始内容快照时，不额外渲染（仅用于审计，不在 Timeline 中展示）
5. 当 `events` 为空数组时，显示 antd `Empty` 组件，描述为 "暂无处理记录"

字段中文名映射：`title` → "标题"、`description` → "描述"、`priority` → "优先级"、`dueDate` → "截止日期"

#### Scenario: Timeline 显示处理历史

- **WHEN** 传入 3 条 TicketHistoryEvent（action 分别为 created / assigned / completed），其中 assigned 的 `details` 为 `{"assignee":"completer1"}`
- **THEN** antd Timeline SHALL 渲染 3 个条目，分别显示 "创建工单"、"指派"、"完成"，每条包含 actor 和时间戳，assigned 条目额外显示指派目标 "completer1"

#### Scenario: 空历史显示 Empty

- **WHEN** 传入空数组 `[]`
- **THEN** SHALL 显示 antd Empty "暂无处理记录"

#### Scenario: 改派操作显示正确标签

- **WHEN** 传入 1 条 action 为 `reassigned` 的 TicketHistoryEvent，`details` 为 `{"assignee":"completer2","prevAssignee":"completer1"}`
- **THEN** Timeline item SHALL 显示 "改派"，并展示指派目标 "completer2" 和原处理人 "completer1"

#### Scenario: 编辑操作显示字段变更

- **WHEN** 传入 1 条 action 为 `edited` 的 TicketHistoryEvent，`details` 为 `{"field":"title","oldValue":"旧标题","newValue":"新标题"}`
- **THEN** Timeline item SHALL 显示 "编辑了标题"，并展示 "旧标题 → 新标题" 的变更内容，color 为 purple

#### Scenario: 备注操作显示评论内容

- **WHEN** 传入 1 条 action 为 `commented` 的 TicketHistoryEvent，`details` 为 `{"comment":"已确认问题"}`
- **THEN** Timeline item SHALL 显示 "添加了备注"，并展示评论文本 "已确认问题"

#### Scenario: created 事件不渲染原始内容快照

- **WHEN** 传入 1 条 action 为 `created` 的 TicketHistoryEvent，`details` 为 `{"title":"Bug","description":"...","priority":"high","dueDate":"2026-06-01"}`
- **THEN** Timeline item SHALL 仅显示 "创建工单"，不渲染 details 中的快照内容

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

`action` SHALL 仅允许 `created`、`assigned`、`reassigned`、`started`、`completed`、`edited`、`commented` 七种值。

#### Scenario: 迁移成功执行

- **WHEN** 运行 `pnpm db:migrate`
- **THEN** `ticket_history` 表 SHALL 被创建，已有工单 SHALL 各有一条 action=`created` 的 history

#### Scenario: action 字段接受新值

- **WHEN** 插入一条 `action='edited'` 的 ticket_history 记录
- **THEN** 数据库 SHALL 接受该记录，无约束违反错误

#### Scenario: 重复迁移不报错

- **WHEN** 再次运行 `pnpm db:migrate`
- **THEN** 命令 SHALL 退出码为 0，无重复表/索引错误

### Requirement: TKT-023 状态变更写入 History

以下端点 SHALL 在执行状态变更后，通过 Drizzle ORM 向 `ticketHistory` 表插入一条记录：

| 端点 | action | fromStatus | toStatus | details |
|------|--------|-----------|----------|---------|
| `POST /api/tickets` | `created` | null | `submitted` | 原始内容快照 JSON `{"title","description","priority","dueDate"}` |
| `PATCH /api/tickets/:id/assign` (首次) | `assigned` | `submitted` | `assigned` | `{"assignee":"<v>"}` |
| `PATCH /api/tickets/:id/assign` (重指派) | `reassigned` | `assigned` | `assigned` | `{"assignee":"<v>","prevAssignee":"<old>"}` |
| `PATCH /api/tickets/:id/start` | `started` | `assigned` | `in_progress` | null |
| `PATCH /api/tickets/:id/complete` | `completed` | `in_progress` | `completed` | null |
| `PATCH /api/tickets/:id` (编辑) | `edited` | <当前状态> | <当前状态> | `{"field","oldValue","newValue"}` |
| `POST /api/tickets/:id/comments` (备注) | `commented` | <当前状态> | <当前状态> | `{"comment":"<v>"}` |

每条记录的 `id` SHALL 由 `crypto.randomUUID()` 生成，`actor` SHALL 从 `c.get('user').username` 获取，`createdAt` SHALL 为 ISO 8601 当前时间。

#### Scenario: 创建工单写入 created 事件

- **WHEN** 发送 `POST /api/tickets` 创建工单成功
- **THEN** `ticketHistory` 表 SHALL 包含一条 `action: "created"`、`actor: "<submitter>"`、`toStatus: "submitted"`、`fromStatus: null` 的记录，`details` SHALL 为包含 title/description/priority/dueDate 的原始内容快照 JSON

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
export type TicketHistoryAction = 'created' | 'assigned' | 'reassigned' | 'started' | 'completed' | 'edited' | 'commented'

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

#### Scenario: 新 action 值类型可用

- **WHEN** 在 `apps/web` 或 `apps/server` 中使用 `action: 'edited'` 或 `action: 'commented'` 赋值给 `TicketHistoryAction` 类型变量
- **THEN** TypeScript SHALL 编译通过，无类型错误

#### Scenario: 类型前后端可用

- **WHEN** 在 `apps/web` 或 `apps/server` 中 `import type { TicketHistoryEvent } from '@ticketflow/shared'`
- **THEN** SHALL 获得包含 id / ticketId / action / actor / fromStatus / toStatus / details / createdAt 的类型定义

### Requirement: TKT-019 创建工单时存储原始内容快照

`POST /api/tickets` 创建工单时，SHALL 在写入 `ticket_history` 表的第一个事件（action=`created`）中，将 `details` 字段设置为包含原始内容快照的 JSON 字符串。此快照永不被修改，作为工单的原始内容记录，可通过 `ticket_history WHERE action='created'` 随时还原。

#### Scenario: 创建工单时 details 包含原始内容快照

- **WHEN** 发送 `POST /api/tickets`，body 为 `{ "title": "Bug fix", "description": "Login fails", "priority": "high", "dueDate": "2026-06-01" }`
- **THEN** 响应状态码 SHALL 为 `201`，查询 `ticket_history` 中对应工单的 `action='created'` 记录，其 `details` SHALL 为 `{"title":"Bug fix","description":"Login fails","priority":"high","dueDate":"2026-06-01"}`

#### Scenario: 未传可选字段时快照包含默认值

- **WHEN** 发送 `POST /api/tickets`，body 为 `{ "title": "Simple", "description": "test" }`（不传 priority 和 dueDate）
- **THEN** `ticket_history` 中 `action='created'` 记录的 `details` SHALL 包含 `"priority":"medium"` 和 `"dueDate":null`

### Requirement: TKT-020 工单编辑 API

`PATCH /api/tickets/:id` SHALL 接受 JSON body `{ title?: string, description?: string, priority?: string, dueDate?: string }`，仅允许 submitter（即 `createdBy` 与当前用户相同）在工单 status=`submitted` 时编辑。

权限校验失败 SHALL 返回 `403`；状态不满足条件 SHALL 返回 `400`。

成功更新 SHALL：
1. 更新 `tickets` 表中提供的字段
2. 对每个变更字段写入一条 `ticket_history` 记录（action=`edited`，fromStatus=<当前状态>，toStatus=<当前状态>，details 包含 `field`/`oldValue`/`newValue`）
3. 更新 `tickets.updatedAt`

校验规则：
- `title` 不为空字符串且 ≤200 字符
- `description` 若提供，≤2000 字符
- `priority` 在 `low`/`medium`/`high` 中
- `dueDate` 格式为 `YYYY-MM-DD`（若提供）
- body 为空对象 `{}` 时，返回 `400`（无字段可更新）

#### Scenario: submitter 在 submitted 状态编辑工单

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，body 为 `{ "title": "Updated title" }`，工单 status 为 `submitted` 且 `createdBy` 为当前用户
- **THEN** 响应状态码 SHALL 为 `200`，`title` SHALL 为 `"Updated title"`，`ticket_history` 中新增一条 action=`edited` 记录，fromStatus 和 toStatus 均为当前状态，details 为 `{"field":"title","oldValue":"<原值>","newValue":"Updated title"}`

#### Scenario: 未登录用户编辑被拒绝

- **WHEN** 未登录用户发送 `PATCH /api/tickets/:id`
- **THEN** 响应状态码 SHALL 为 `401`

#### Scenario: 非 submitter 编辑被拒绝

- **WHEN** dispatcher 发送 `PATCH /api/tickets/:id`，工单 `createdBy` 不是 dispatcher
- **THEN** 响应状态码 SHALL 为 `403`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: 非 submitted 状态编辑被拒绝

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，工单 status 为 `assigned`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: title 为空时拒绝

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，body 为 `{ "title": "" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: body 为空时拒绝

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，body 为 `{}`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: priority 非法值返回 400

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，body 为 `{ "priority": "urgent" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: title 超过 200 字符返回 400

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，body 为 `{ "title": "<201 字符的字符串>" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: description 超过 2000 字符返回 400

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，body 为 `{ "description": "<2001 字符的字符串>" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: dueDate 格式非法返回 400

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，body 为 `{ "dueDate": "not-a-date" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: 同时编辑多个字段写入多条历史

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，body 为 `{ "title": "New", "priority": "high" }`
- **THEN** `ticket_history` 中 SHALL 新增 2 条 action=`edited` 记录，分别对应 title 和 priority 变更

#### Scenario: 所有字段值与当前值相同

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，body 中所有字段值与工单当前值完全相同
- **THEN** 响应状态码 SHALL 为 `200`，不写入 ticket_history 记录（无变更字段）

#### Scenario: 工单不存在返回 404

- **WHEN** 发送 `PATCH /api/tickets/non-existent-id`
- **THEN** 响应状态码 SHALL 为 `404`

### Requirement: TKT-021 工单备注 API

`POST /api/tickets/:id/comments` SHALL 接受 JSON body `{ comment: string }`，允许任何登录用户在任何工单状态下添加备注。

成功 SHALL：
1. 写入一条 `ticket_history` 记录（action=`commented`，fromStatus=<当前状态>，toStatus=<当前状态>，details 为 `{"comment":"<备注内容>"}`，actor 为当前用户 username）
2. 不修改 `tickets` 表

校验规则：
- `comment` 不为空字符串且 ≤2000 字符

#### Scenario: 成功添加备注

- **WHEN** 登录用户发送 `POST /api/tickets/:id/comments`，body 为 `{ "comment": "已确认问题，正在修复" }`
- **THEN** 响应状态码 SHALL 为 `201`，`ticket_history` 中新增一条 action=`commented` 记录，fromStatus 和 toStatus 均为当前状态，details 为 `{"comment":"已确认问题，正在修复"}`，actor 为当前用户 username

#### Scenario: comment 为空时拒绝

- **WHEN** 发送 `POST /api/tickets/:id/comments`，body 为 `{ "comment": "" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: comment 超过 2000 字符时拒绝

- **WHEN** 发送 `POST /api/tickets/:id/comments`，body 为 `{ "comment": "<2001 字符的字符串>" }`
- **THEN** 响应状态码 SHALL 为 `400`，响应体 SHALL 为 `{ error: string }` 格式

#### Scenario: 未登录用户被拒绝

- **WHEN** 未登录用户发送 `POST /api/tickets/:id/comments`
- **THEN** 响应状态码 SHALL 为 `401`

#### Scenario: 工单不存在返回 404

- **WHEN** 发送 `POST /api/tickets/non-existent-id/comments`
- **THEN** 响应状态码 SHALL 为 `404`
