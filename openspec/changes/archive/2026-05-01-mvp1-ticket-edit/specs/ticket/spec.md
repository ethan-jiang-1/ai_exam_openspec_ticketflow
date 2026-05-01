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

## MODIFIED Requirements

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

`apps/server/src/db/schema.ts` 的 `ticketHistory` 表 `action` 字段 SHALL 扩展允许值，从 `created`/`assigned`/`reassigned`/`started`/`completed` 五种扩展为七种：新增 `edited` 和 `commented`。

#### Scenario: action 字段接受新值

- **WHEN** 插入一条 `action='edited'` 的 ticket_history 记录
- **THEN** 数据库 SHALL 接受该记录，无约束违反错误

### Requirement: TKT-023 状态变更写入 History

`POST /api/tickets` 创建工单时写入的 `ticket_history` 记录，其 `details` 字段 SHALL 从 `null` 改为包含原始内容快照的 JSON 字符串（格式见 TKT-019），其余端点行为不变。

#### Scenario: 创建工单 details 不为 null

- **WHEN** 发送 `POST /api/tickets` 创建工单成功
- **THEN** `ticketHistory` 表对应记录的 `details` 字段 SHALL 为原始内容快照 JSON，而非 `null`

### Requirement: TKT-025 TicketHistoryEvent 共享类型

`packages/shared/src/ticket-types.ts` 的 `TicketHistoryAction` 类型 SHALL 从 `'created' | 'assigned' | 'reassigned' | 'started' | 'completed'` 扩展为 `'created' | 'assigned' | 'reassigned' | 'started' | 'completed' | 'edited' | 'commented'`。

#### Scenario: 新 action 值类型可用

- **WHEN** 在 `apps/web` 或 `apps/server` 中使用 `action: 'edited'` 或 `action: 'commented'` 赋值给 `TicketHistoryAction` 类型变量
- **THEN** TypeScript SHALL 编译通过，无类型错误
