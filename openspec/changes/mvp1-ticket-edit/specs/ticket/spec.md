## ADDED Requirements

### Requirement: TKT-019 创建工单时存储原始内容快照

`POST /api/tickets` 创建工单时，SHALL 在写入 `ticket_history` 表的第一个事件（action=`created`）中，将 `details` 字段设置为包含原始内容快照的 JSON 字符串：

```json
{
  "title": "<原始标题>",
  "description": "<原始描述>",
  "priority": "<原始优先级>",
  "dueDate": "<原始截止日期或null>"
}
```

此快照永不被修改，作为工单的原始内容记录，可通过 `ticket_history WHERE action='created'` 随时还原。

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
2. 对每个变更字段写入一条 `ticket_history` 记录（action=`edited`，details 包含 `field`/`oldValue`/`newValue`）
3. 更新 `tickets.updatedAt`

校验规则：
- `title` 不为空字符串且 ≤200 字符
- `description` 若提供，≤2000 字符
- `priority` 在 `low`/`medium`/`high` 中
- `dueDate` 格式为 `YYYY-MM-DD`（若提供）
- body 为空对象 `{}` 时，返回 `400`（无字段可更新）

#### Scenario: submitter 在 submitted 状态编辑工单

- **WHEN** submitter 发送 `PATCH /api/tickets/:id`，body 为 `{ "title": "Updated title" }`，工单 status 为 `submitted` 且 `createdBy` 为当前用户
- **THEN** 响应状态码 SHALL 为 `200`，`title` SHALL 为 `"Updated title"`，`ticket_history` 中新增一条 action=`edited` 记录，details 为 `{"field":"title","oldValue":"<原值>","newValue":"Updated title"}`

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
1. 写入一条 `ticket_history` 记录（action=`commented`，details 为 `{"comment":"<备注内容>"}`，actor 为当前用户 username）
2. 不修改 `tickets` 表

校验规则：
- `comment` 不为空字符串且 ≤2000 字符

#### Scenario: 成功添加备注

- **WHEN** 登录用户发送 `POST /api/tickets/:id/comments`，body 为 `{ "comment": "已确认问题，正在修复" }`
- **THEN** 响应状态码 SHALL 为 `201`，`ticket_history` 中新增一条 action=`commented` 记录，details 为 `{"comment":"已确认问题，正在修复"}`，actor 为当前用户 username

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

## MODIFIED Requirements

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
