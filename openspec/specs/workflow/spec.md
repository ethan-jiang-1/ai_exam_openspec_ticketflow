### Requirement: WF-001 角色选择页

`/` 路由 SHALL 显示角色选择页，包含三个可选角色（submitter / dispatcher / completer），用户点击后 SHALL 将角色存入 `localStorage`（key: `ticketflow-role`）并跳转到对应工作台 `/workbench/:role`。

#### Scenario: 选择角色后跳转

- **WHEN** 用户在角色选择页点击 "提交者" 按钮
- **THEN** `localStorage` 中 `ticketflow-role` SHALL 为 `"submitter"`，页面 SHALL 跳转到 `/workbench/submitter`

#### Scenario: 已有角色时直接跳转

- **WHEN** 用户访问 `/`，且 `localStorage` 中已有 `ticketflow-role` 为 `"dispatcher"`
- **THEN** 页面 SHALL 自动跳转到 `/workbench/dispatcher`

#### Scenario: 角色值无效时留在选择页

- **WHEN** 用户访问 `/`，且 `localStorage` 中 `ticketflow-role` 为 `"invalid_role"`
- **THEN** 页面 SHALL 停留在角色选择页（不跳转）

### Requirement: WF-002 共享 Layout

所有 `/workbench/*` 路由 SHALL 使用共享 Layout 组件，顶部显示当前角色名称和"切换角色"按钮。

#### Scenario: 显示当前角色

- **WHEN** 用户以 submitter 角色进入工作台
- **THEN** Layout 顶部 SHALL 显示 "提交者" 文本

#### Scenario: 切换角色

- **WHEN** 用户点击 "切换角色" 按钮
- **THEN** 页面 SHALL 跳转回 `/`（角色选择页），`localStorage` 中的角色值 SHALL 被清除

### Requirement: WF-003 提交者工作台

`/workbench/submitter` SHALL 显示提交者工作台，包含：创建工单表单（title + description 输入框 + 提交按钮）和工单列表。工单列表 SHALL 仅显示 `createdBy === "submitter"` 的工单（通过 `getTickets()` 获取全部后在客户端过滤）。

#### Scenario: 创建工单

- **WHEN** 用户填写 title 为 "Fix login" 和 description 为 "Safari 上无法登录"，点击提交
- **THEN** SHALL 调用 `POST /api/tickets`，body 为 `{ title: "Fix login", description: "Safari 上无法登录", createdBy: "submitter" }`，成功后工单列表 SHALL 刷新显示新工单

#### Scenario: 工单列表仅显示自己创建的

- **WHEN** `getTickets()` 返回 4 条工单，其中 2 条 `createdBy` 为 `"submitter"`，2 条为 `"dispatcher"`
- **THEN** 页面 SHALL 仅显示 2 条 `createdBy === "submitter"` 的工单

#### Scenario: title 为空时提交按钮禁用

- **WHEN** title 输入框为空
- **THEN** 提交按钮 SHALL 处于禁用状态

#### Scenario: API 调用失败时显示错误

- **WHEN** 创建工单或获取工单列表时后端返回错误
- **THEN** 页面 SHALL 显示错误提示信息（非白屏）

### Requirement: WF-004 调度者工作台

`/workbench/dispatcher` SHALL 显示所有状态为 `submitted` 的工单（通过 `getTickets()` 获取全部后在客户端按 `status === "submitted"` 过滤），每条工单有一个"指派"操作。

#### Scenario: 指派工单

- **WHEN** 调度者看到一条 submitted 工单，在指派人输入框填入 "completer"，点击指派
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/assign`，body 为 `{ assignedTo: "completer" }`，成功后列表 SHALL 刷新

#### Scenario: 无待指派工单

- **WHEN** 所有工单都不是 submitted 状态
- **THEN** 页面 SHALL 显示"暂无待指派的工单"提示

#### Scenario: API 调用失败时显示错误

- **WHEN** 指派或获取工单列表时后端返回错误
- **THEN** 页面 SHALL 显示错误提示信息（非白屏）

### Requirement: WF-005 完成者工作台

`/workbench/completer` SHALL 显示所有 `assignedTo === "completer"` 且状态为 `assigned` 或 `in_progress` 的工单（客户端过滤）。`assigned` 状态的工单有"开始处理"按钮，`in_progress` 状态的工单有"完成"按钮。

#### Scenario: 开始处理工单

- **WHEN** 完成者看到一条 assigned 且 assignedTo 为 "completer" 的工单，点击"开始处理"
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/start`，成功后列表 SHALL 刷新，工单状态变为 `in_progress`

#### Scenario: 完成工单

- **WHEN** 完成者看到一条 in_progress 的工单，点击"完成"
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/complete`，成功后列表 SHALL 刷新，工单状态变为 `completed`

#### Scenario: 不显示非自己的工单

- **WHEN** 有一条 assigned 工单，assignedTo 为 "other_person"
- **THEN** 该工单 SHALL 不出现在完成者工作台

#### Scenario: API 调用失败时显示错误

- **WHEN** 开始处理、完成或获取工单列表时后端返回错误
- **THEN** 页面 SHALL 显示错误提示信息（非白屏）

### Requirement: WF-006 API Client 封装

`apps/web/src/api/client.ts` SHALL 导出 `getTickets`、`getTicket`、`createTicket`、`assignTicket`、`startTicket`、`completeTicket` 六个函数，使用原生 `fetch` 调用后端 API。

#### Scenario: createTicket 发送正确请求

- **WHEN** 调用 `createTicket({ title: "Bug", description: "Desc", createdBy: "alice" })`
- **THEN** SHALL 发送 `POST /api/tickets`，Content-Type 为 `application/json`，body 为对应 JSON

#### Scenario: API 错误时抛出异常

- **WHEN** 后端返回 400 或 404
- **THEN** 函数 SHALL 抛出包含 error 信息的异常

### Requirement: WF-007 Vite Proxy 修复

`apps/web/vite.config.ts` 的 proxy 配置 SHALL 去掉 `rewrite` 规则，使前端 `/api/tickets` 请求直接转发到 `http://localhost:3000/api/tickets`。

#### Scenario: API 请求正确代理

- **WHEN** 前端在开发模式下发送 `GET /api/tickets`
- **THEN** 请求 SHALL 被代理到 `http://localhost:3000/api/tickets`（保留 `/api` 前缀）

### Requirement: WF-008 react-router-dom 路由挂载

`apps/web/src/main.tsx` SHALL 用 `BrowserRouter`（v7 的 v6 兼容 API）包裹 `App`，`App.tsx` SHALL 定义路由：`/` → 角色选择页，`/workbench/submitter` → 提交者工作台，`/workbench/dispatcher` → 调度者工作台，`/workbench/completer` → 完成者工作台。未匹配路由 SHALL 用 `Navigate` 重定向到 `/`。

#### Scenario: 访问无效路由

- **WHEN** 用户访问 `/unknown-path`
- **THEN** 页面 SHALL 重定向到 `/`

### Requirement: WF-009 Status badge 样式

工单列表中的状态字段 SHALL 显示为带颜色的 badge（圆角背景标签），不同状态使用不同颜色：
- `submitted` → 蓝色背景
- `assigned` → 黄色背景
- `in_progress` → 橙色背景
- `completed` → 绿色背景

#### Scenario: 状态显示为 badge

- **WHEN** 工单列表中有状态为 `submitted` 的工单
- **THEN** 状态列 SHALL 显示为蓝色背景的 `submitted` 文本标签
