## ADDED Requirements

### Requirement: DSH-001 全局统计 API

`GET /api/dashboard` SHALL 返回全局工单统计信息，包含 overview（总量/本周新建/本周完成/待处理/优先级分布）、efficiency（平均响应时间/平均处理时间/改派次数）、workload（按完成者负载统计）、recentActivity（最近 10 条操作动态，含工单标题）。只有 role 为 admin 或 dispatcher 的已认证用户可访问，其他角色返回 403 `{ error: "无权限访问" }`。

数据来源：
- overview.total: `tickets` 表 COUNT(*)
- overview.createdThisWeek: `tickets` 表 COUNT(*) WHERE created_at >= 本周一 00:00:00
- overview.completedThisWeek: `ticket_history` 表 COUNT(*) WHERE action='completed' AND created_at >= 本周一 00:00:00
- overview.pending: `tickets` 表 COUNT(*) WHERE status != 'completed'
- overview.priorityDistribution: `tickets` 表按 priority 分组 COUNT（仅 status != 'completed' 的工单），返回 `{ high: number, medium: number, low: number }`
- efficiency.avgResponseMinutes: 对有指派记录的工单，计算「首次指派时间 - 创建时间」的平均分钟数。首次指派时间 = ticket_history 中 action='assigned' 且 ticket_id 对应的最小 created_at
- efficiency.avgProcessMinutes: 对已完成工单，计算「完成时间 - 首次指派时间」的平均分钟数。完成时间 = ticket_history 中 action='completed' 且 ticket_id 对应的最小 created_at
- efficiency.reassignCount: `ticket_history` 表 COUNT(*) WHERE action='reassigned' AND created_at >= 本周一 00:00:00
- workload: 所有 role='completer' 的用户，每人统计 assignedCount（tickets WHERE assigned_to=username AND status='assigned'）、inProgressCount（tickets WHERE assigned_to=username AND status='in_progress'）、completedThisWeekCount（ticket_history 表 JOIN tickets 表，WHERE ticket_history.action='completed' AND tickets.assigned_to=username AND ticket_history.created_at >= 本周一 00:00:00，按 ticket_id 去重）
- recentActivity: `ticket_history` 表 JOIN `tickets` 表（获取 ticketTitle = tickets.title），ORDER BY ticket_history.created_at DESC LIMIT 10，每条包含 id、ticketId、ticketTitle、action、actor、toStatus、createdAt

所有数据库操作 SHALL 通过 Drizzle ORM API 完成，禁止原始 SQL。

#### Scenario: admin 获取 dashboard 数据

- **WHEN** admin 用户已登录，发送 `GET /api/dashboard`
- **THEN** 返回 200，body 包含 `{ overview: { total, createdThisWeek, completedThisWeek, pending, priorityDistribution: { high, medium, low } }, efficiency: { avgResponseMinutes, avgProcessMinutes, reassignCount }, workload: [{ username, displayName, assignedCount, inProgressCount, completedThisWeekCount }], recentActivity: [{ id, ticketId, ticketTitle, action, actor, toStatus, createdAt }] }`

#### Scenario: dispatcher 获取 dashboard 数据

- **WHEN** dispatcher 用户已登录，发送 `GET /api/dashboard`
- **THEN** 返回 200，body 结构与 admin 相同

#### Scenario: submitter 访问 dashboard API 被拒

- **WHEN** submitter 用户已登录，发送 `GET /api/dashboard`
- **THEN** 返回 403，body 为 `{ error: "无权限访问" }`

#### Scenario: completer 访问 dashboard API 被拒

- **WHEN** completer 用户已登录，发送 `GET /api/dashboard`
- **THEN** 返回 403，body 为 `{ error: "无权限访问" }`

#### Scenario: 未登录访问 dashboard API

- **WHEN** 未登录用户发送 `GET /api/dashboard`（无 session cookie）
- **THEN** 返回 401，body 为 `{ error: "未登录" }`

#### Scenario: 无工单但存在用户时返回零值

- **WHEN** 系统中没有任何工单和 ticket_history 记录，但存在 completer 用户，admin 发送 `GET /api/dashboard`
- **THEN** 返回 200，overview 各项为 0，priorityDistribution 各项为 0，efficiency.avgResponseMinutes 和 avgProcessMinutes 为 0，efficiency.reassignCount 为 0，workload 返回所有 completer 用户（各项计数为 0），recentActivity 为空数组 `[]`

#### Scenario: 有工单但无历史记录时效率指标为 0

- **WHEN** 系统中有 2 条工单（均为 submitted 状态）但 ticket_history 表为空（没有任何操作记录），admin 发送 `GET /api/dashboard`
- **THEN** 返回 200，efficiency.avgResponseMinutes 和 avgProcessMinutes SHALL 为 0（不产生 NaN 或除零错误），overview.pending 为 2

#### Scenario: 平均响应时间计算正确

- **WHEN** 工单 T1（created_at 为 10:00）被指派（ticket_history action=assigned, created_at=10:30），工单 T2（created_at 为 11:00）被指派（ticket_history action=assigned, created_at=11:20）
- **THEN** avgResponseMinutes SHALL 为 25（(30+20)/2）

#### Scenario: recentActivity 包含工单标题

- **WHEN** 工单 T1（title="修复登录页样式"）有一条 completed 记录（actor="completer"），admin 发送 `GET /api/dashboard`
- **THEN** recentActivity 数组第一条 SHALL 包含 `ticketTitle: "修复登录页样式"`、`action: "completed"`、`actor: "completer"`

#### Scenario: 优先级分布统计正确

- **WHEN** 系统中有 3 条未完成工单（priority 分别为 high/high/low），1 条已完成工单（priority=high），admin 发送 `GET /api/dashboard`
- **THEN** priorityDistribution SHALL 为 `{ high: 2, medium: 0, low: 1 }`（仅统计 status != 'completed'）

### Requirement: DSH-002 Dashboard 统计面板页面

`/dashboard` 路由 SHALL 显示 DashboardPage 组件，单页滚动布局，自上而下包含 5 行内容。数据来源为 `GET /api/dashboard`（通过 `getDashboard()` 函数调用）。页面加载时 SHALL 显示 loading 状态，加载完成后展示数据。API 调用失败时 SHALL 通过 `AntdApp.useApp()` hook 获取的 `message` 实例显示错误提示，页面不白屏。

页面布局（单页滚动，无内嵌 Tab）：

**行 1 — KPI 卡片（4 个）：**
使用 `Row`/`Col`（`xs={12} sm={6}`），4 个 antd `Card`（`size="small"`），每个 Card 内放 antd `Statistic` 组件（`valueStyle={{ fontSize: 24, fontWeight: 600 }}`），标题分别为 "工单总数"、"本周新建"、"本周完成"、"待处理"，值来自 API overview 字段。Statistic 使用数字跳动效果。

**行 2 — 完成率仪表盘 + 优先级分布：**
使用 `Row`/`Col`，左侧 `Col sm={8}` 放 antd `Card`，内嵌 `Progress type="dashboard" percent={completionRate}`，标题 "完成率"。完成率 = `completedThisWeek / createdThisWeek * 100`，createdThisWeek 为 0 时显示 0。
右侧 `Col sm={16}` 放 antd `Card`，标题 "待处理工单优先级分布"，内嵌 3 条 `Progress percent={...} showInfo={true}`：
- 紧急（high）：`strokeColor="#ff4d4f"`，值来自 priorityDistribution.high
- 中等（medium）：`strokeColor="#faad14"`，值来自 priorityDistribution.medium
- 低（low）：`strokeColor="#1890ff"`，值来自 priorityDistribution.low
每条 Progress 的 `percent` = 该优先级的 pending 数量 / pending 总数 * 100。

**行 3 — 效率指标（3 个）：**
使用 `Row`/`Col`（`xs={12} sm={8}`），3 个 antd `Card`（`size="small"`），内嵌 `Statistic`，标题分别为 "平均响应时间"、"平均处理时间"、"本周改派次数"，值来自 API efficiency 字段。avgResponseMinutes 和 avgProcessMinutes 后缀为 "分钟"。

**行 4 — 负载表格：**
antd `Table`（`pagination={false}`），列为：
- 完成者（displayName）
- 待处理 — 使用 `render` 返回 `<Progress percent={...} size="small" />` + 数字，`strokeColor="#faad14"`。percent = assignedCount / totalAssigned * 100（totalAssigned 为所有完成者 assignedCount 之和，为 0 时显示 0）
- 处理中 — `<Progress percent={...} size="small" />` + 数字，`strokeColor="#1890ff"`
- 本周完成 — 纯数字（completedThisWeekCount）

**行 5 — 最近动态：**
antd `Timeline` + `Tag` 展示 recentActivity（最近 10 条），每条显示时间（HH:mm 格式）、actor、action 描述文本、工单标题（ticketTitle 可点击链接，点击后弹出 `TicketDetailDrawer`）、状态 Tag（使用 STATUS_COLORS）。
Timeline dot `color` 按 action 类型区分：
- `created` → `color="blue"`
- `assigned` → `color="gold"`
- `reassigned` → `color="orange"`
- `started` → `color="cyan"`
- `completed` → `color="green"`
- `edited`/`commented` → `color="default"`

#### Scenario: admin 查看 Dashboard 面板

- **WHEN** admin 用户访问 `/dashboard` 页面，API 返回完整数据
- **THEN** 页面 SHALL 显示 5 行内容：4 个 KPI Statistic、完成率仪表盘 + 优先级 Progress 条、3 个效率 Statistic、负载 Table（含 Progress 条）、Timeline 最近动态

#### Scenario: Dashboard API 调用失败

- **WHEN** admin 用户访问 `/dashboard` 页面，`GET /api/dashboard` 返回 500 错误
- **THEN** 页面 SHALL 通过 `message.error()` 显示错误提示，页面不白屏

#### Scenario: Dashboard 页面加载中

- **WHEN** admin 用户访问 `/dashboard` 页面，API 尚未返回
- **THEN** 页面 SHALL 显示 antd `Spin` 组件

#### Scenario: 完成率为 0 时仪表盘显示 0

- **WHEN** API 返回 `createdThisWeek: 0`，admin 查看 Dashboard
- **THEN** 完成率仪表盘 SHALL 显示 `percent={0}`

#### Scenario: 负载表格中 Progress 条颜色正确

- **WHEN** 负载表格有数据，待处理列 Progress `strokeColor` SHALL 为 `#faad14`，处理中列 Progress `strokeColor` SHALL 为 `#1890ff`

#### Scenario: 无 recentActivity 时 Timeline 显示空提示

- **WHEN** API 返回 `recentActivity: []`
- **THEN** Timeline 区域 SHALL 显示 antd `Empty` 组件（`description="暂无动态"`）

### Requirement: DSH-003 角色访问控制

`/dashboard` 路由 SHALL 仅允许 role 为 admin 或 dispatcher 的用户访问。submitter 和 completer 用户访问 `/dashboard` 时 SHALL 重定向到各自工作台（`/workbench/:role`）。未登录用户访问 `/dashboard` SHALL 重定向到 `/login`。

Layout Header 中 "数据面板" 导航链接 SHALL 仅在 `user.role === 'admin' || user.role === 'dispatcher'` 时渲染。

#### Scenario: admin 访问 /dashboard

- **WHEN** admin 用户已登录，访问 `/dashboard`
- **THEN** SHALL 渲染 DashboardPage，Layout Header 显示 "数据面板" 链接

#### Scenario: dispatcher 访问 /dashboard

- **WHEN** dispatcher 用户已登录，访问 `/dashboard`
- **THEN** SHALL 渲染 DashboardPage，Layout Header 显示 "数据面板" 链接

#### Scenario: submitter 访问 /dashboard 被重定向

- **WHEN** submitter 用户已登录，访问 `/dashboard`
- **THEN** SHALL 重定向到 `/workbench/submitter`

#### Scenario: completer 访问 /dashboard 被重定向

- **WHEN** completer 用户已登录，访问 `/dashboard`
- **THEN** SHALL 重定向到 `/workbench/completer`

#### Scenario: submitter 看不到数据面板链接

- **WHEN** submitter 用户已登录，进入工作台
- **THEN** Layout Header SHALL 不显示 "数据面板" 链接

#### Scenario: completer 看不到数据面板链接

- **WHEN** completer 用户已登录，进入工作台
- **THEN** Layout Header SHALL 不显示 "数据面板" 链接
