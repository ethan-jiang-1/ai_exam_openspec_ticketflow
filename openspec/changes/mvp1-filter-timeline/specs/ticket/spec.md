## ADDED Requirements

### Requirement: TKT-017 共享 TicketDetailDrawer 组件

`apps/web/src/components/TicketDetailDrawer.tsx` SHALL 导出 `TicketDetailDrawer` 组件，接受以下 props：

```typescript
interface TicketDetailDrawerProps {
  ticket: Ticket | null
  open: boolean
  onClose: () => void
  showTimeline?: boolean  // 默认 true
}
```

组件内部 SHALL：
1. 使用 antd `Drawer`（`width={480}`，`title={ticket.title}`）
2. 使用 antd `Descriptions`（`column={1}`、`bordered`、`size="small"`）展示工单详情字段：状态（antd `Tag` + 中文标签）、创建者、指派给、优先级（antd `Tag`）、截止日期、创建时间、描述
3. 当 `showTimeline` 为 `true` 时，调用 `getTicketHistory(ticket.id)` 获取历史数据，通过 `Timeline` 组件渲染处理时间线
4. 当 `getTicketHistory` 失败时，显示 antd `Empty` 组件，描述为 "无法加载处理历史"

`ticket` 为 `null` 时 SHALL 不渲染 Drawer（或 `open` 为 `false`）。

三个工作台页面（SubmitterWorkbench、DispatcherWorkbench、CompleterWorkbench）SHALL 统一使用此组件，不再各自内联 Drawer 实现。

#### Scenario: Drawer 展示工单详情

- **WHEN** 传入有效 `ticket` 对象，`open=true`
- **THEN** antd Drawer SHALL 显示工单标题为 title，Descriptions 展示状态（Tag）、创建者、指派给、优先级（Tag）、截止日期、创建时间、描述

#### Scenario: 展示处理时间线

- **WHEN** `showTimeline=true` 且 `getTicketHistory` 返回 2 条记录
- **THEN** Drawer 内 SHALL 渲染 antd Timeline，包含 2 个条目

#### Scenario: 历史加载失败时的降级显示

- **WHEN** `getTicketHistory` API 调用失败
- **THEN** SHALL 显示 antd Empty "无法加载处理历史"，Drawer 其余部分正常显示

### Requirement: TKT-018 Timeline 组件

`apps/web/src/components/Timeline.tsx` SHALL 导出 `Timeline` 组件，接受 `events: TicketHistoryEvent[]` prop。

组件内部 SHALL：
1. 使用 antd `Timeline` 组件渲染历史事件列表
2. 每个 `Timeline.Item` SHALL 显示：
   - action 中文标签（映射表：`created` → "创建工单"、`assigned` → "指派"、`reassigned` → "改派"、`started` → "开始处理"、`completed` → "完成"）
   - actor（操作人 username）
   - 通过 `new Date(createdAt).toLocaleString()` 格式化的时间戳
3. Timeline item `color` 按 action 类型区分：`created`=blue, `assigned`/`reassigned`=gold, `started`=orange, `completed`=green
4. 当 `details` 不为 null 时（`assigned` 含 `{assignee}`，`reassigned` 含 `{assignee, prevAssignee}`），解析 JSON 并在 item 中显示指派目标信息
5. 当 `events` 为空数组时，显示 antd `Empty` 组件，描述为 "暂无处理记录"

#### Scenario: Timeline 显示处理历史

- **WHEN** 传入 3 条 TicketHistoryEvent（action 分别为 created / assigned / completed），其中 assigned 的 `details` 为 `{"assignee":"completer1"}`
- **THEN** antd Timeline SHALL 渲染 3 个条目，分别显示 "创建工单"、"指派"、"完成"，每条包含 actor 和时间戳，assigned 条目额外显示指派目标 "completer1"

#### Scenario: 空历史显示 Empty

- **WHEN** 传入空数组 `[]`
- **THEN** SHALL 显示 antd Empty "暂无处理记录"

#### Scenario: 改派操作显示正确标签

- **WHEN** 传入 1 条 action 为 `reassigned` 的 TicketHistoryEvent，`details` 为 `{"assignee":"completer2","prevAssignee":"completer1"}`
- **THEN** Timeline item SHALL 显示 "改派"，并展示指派目标 "completer2" 和原处理人 "completer1"
