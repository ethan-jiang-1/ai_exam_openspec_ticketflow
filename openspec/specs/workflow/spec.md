# workflow Specification

## Purpose
前端工单流转工作台规范：角色选择、三个角色工作台（提交者/调度者/完成者）、API Client 封装、路由挂载和 UI 组件。
## Requirements
### Requirement: WF-001 角色选择页

`/login` 路由 SHALL 显示登录页（替代原 `/` 路由的角色选择页），包含三个可选用户（submitter / dispatcher / completer），使用 antd `Card` 组件（`hoverable` 属性）展示。数据来源为 `GET /api/auth/users` API 返回的用户列表。用户点击 Card 后 SHALL 调用 `POST /api/auth/login`（body: `{ username }`）完成登录，后端设置 cookie session，前端跳转到对应工作台 `/workbench/:role`。Card 使用 antd `Row` / `Col` 布局（`xs={24} sm={8}`），居中排列。

#### Scenario: 选择用户后登录并跳转

- **WHEN** 用户在登录页点击 "提交者" Card
- **THEN** SHALL 调用 `POST /api/auth/login`，body 为 `{ username: "submitter" }`，cookie SHALL 自动设置，页面 SHALL 跳转到 `/workbench/submitter`

#### Scenario: 已登录时直接跳转

- **WHEN** 已登录用户（role=dispatcher）访问 `/login`
- **THEN** 页面 SHALL 自动跳转到 `/workbench/dispatcher`

#### Scenario: Card 展示三个用户

- **WHEN** 用户访问登录页
- **THEN** 页面 SHALL 显示 3 个 antd Card，标题分别为 "提交者"、"调度者"、"完成者"，数据来自 `GET /api/auth/users`

### Requirement: WF-002 共享 Layout

所有 `/workbench/*` 路由 SHALL 使用 antd `Layout` 组件（`Layout` + `Layout.Header` + `Layout.Content`）构建页面骨架。Header 顶部 SHALL 从 `AuthContext` 获取当前用户信息，显示 "{displayName}" 文本和 antd `Button` "退出"按钮。

#### Scenario: 显示当前用户

- **WHEN** submitter 用户以登录状态进入工作台
- **THEN** Layout Header SHALL 显示 "提交者" 文本

#### Scenario: 退出登录

- **WHEN** 用户点击 antd `Button` "退出"
- **THEN** SHALL 调用 `POST /api/auth/logout`，清除 session，页面 SHALL 跳转到 `/login`

### Requirement: WF-003 提交者工作台

`/workbench/submitter` SHALL 显示提交者工作台，包含：antd `Form` 创建工单表单（居中布局 `maxWidth: 480px`，`Form.Item` + `Input` 标题（`maxLength={200}`、`showCount`、`rules: [{ required: true }, { max: 200 }]`）+ `Input.TextArea` 描述（`maxLength={2000}`、`showCount`、`rules: [{ max: 2000 }]`）+ antd `Button` 提交按钮）和 antd `Table` 工单列表（`pagination={false}`，"创建时间"列 `responsive: ['lg']`）。创建工单时 SHALL 不传 `createdBy` 字段，后端从 auth context 获取。前端 `createTicket` 函数 SHALL 删除 `createdBy` 参数，仅接受 `{ title, description }`。工单列表 SHALL 仅显示 `createdBy === user.username` 的工单（通过 `getTickets()` 获取全部后在客户端过滤）。标题列 SHALL 为可点击链接（`ellipsis: true`），点击后 SHALL 弹出 antd `Drawer`（宽度 480px）显示工单详情，使用 antd `Descriptions`（`column={1}`、`bordered`、`size="small"`）展示状态（Tag + 中文标签）、创建者、指派给、创建时间、描述。

#### Scenario: 创建工单不传 createdBy

- **WHEN** submitter 用户在 antd Form 中填写 title 和 description，点击提交
- **THEN** SHALL 调用 `POST /api/tickets`，body 仅包含 `{ title, description }`，不包含 `createdBy`。后端 SHALL 从 auth context 自动填充 `createdBy`

#### Scenario: 工单列表仅显示自己创建的

- **WHEN** `getTickets()` 返回 4 条工单，其中 2 条 `createdBy` 为当前用户 username，2 条为其他用户
- **THEN** antd Table SHALL 仅显示 2 条属于当前用户的工单

#### Scenario: title 为空时表单验证拦截

- **WHEN** title 输入框为空，用户尝试提交
- **THEN** antd Form SHALL 显示必填验证提示，不发送 API 请求

#### Scenario: API 调用失败时显示错误

- **WHEN** 创建工单或获取工单列表时后端返回错误
- **THEN** SHALL 通过 `AntdApp.useApp()` hook 获取的 `message` 实例显示错误提示信息，页面不白屏

#### Scenario: 点击标题弹出 Drawer 查看详情

- **WHEN** 提交者在工单列表中点击某条工单的标题
- **THEN** SHALL 弹出 antd Drawer，使用 Descriptions 展示该工单的状态（Tag）、创建者、指派给、创建时间、描述

### Requirement: WF-004 调度者工作台

`/workbench/dispatcher` SHALL 显示所有未完成状态的工单（通过 `getTickets()` 获取全部后在客户端按 `status !== 'completed'` 过滤），使用 antd `Table`（`pagination={false}`、`scroll={{ x: 'max-content' }}`）展示。标题列 SHALL 为可点击链接（`ellipsis: true`），点击后 SHALL 弹出 antd `Drawer`（宽度 480px）显示工单详情，使用 antd `Descriptions`（`column={1}`、`bordered`、`size="small"`）展示状态（Tag + 中文标签）、创建者、指派给、创建时间、描述。"创建者"和"创建时间"列 SHALL 设置 `responsive: ['lg']`。

- `submitted` 状态的工单：操作列显示 antd `Select`（选项为 `completer`）和 antd `Button` "指派"
- `assigned` 状态的工单：操作列显示文本 "已指派给 {assignedTo}"，无操作按钮
- `in_progress` 状态的工单：操作列显示文本 "处理中（已指派给 {assignedTo}）"，无操作按钮

#### Scenario: 指派工单

- **WHEN** 调度者看到一条 submitted 工单，在 antd `Select` 中选择 "completer"，点击指派 Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/assign`，body 为 `{ assignedTo: "completer" }`，成功后列表 SHALL 刷新

#### Scenario: 已指派工单仍可见

- **WHEN** 调度者视图中有 1 条 submitted 工单和 1 条 assigned 工单
- **THEN** 调度者 SHALL 在 antd Table 中看到 2 条工单，assigned 的工单操作列 SHALL 显示 "已指派给 xxx" 且无指派操作

#### Scenario: 无待处理工单

- **WHEN** 所有工单都是 completed 状态
- **THEN** antd Table SHALL 显示 antd `Empty` 组件，描述为 "暂无待处理的工单"

#### Scenario: 指派人只能选择 completer

- **WHEN** 调度者查看 antd `Select` 控件
- **THEN** 控件选项 SHALL 只包含 `completer`

#### Scenario: API 调用失败时显示错误

- **WHEN** 指派或获取工单列表时后端返回错误
- **THEN** SHALL 通过 `AntdApp.useApp()` hook 获取的 `message` 实例显示错误提示信息，页面不白屏

#### Scenario: 点击标题弹出 Drawer 查看详情

- **WHEN** 调度者在工单列表中点击某条工单的标题
- **THEN** SHALL 弹出 antd Drawer，使用 Descriptions 展示该工单的状态（Tag）、创建者、指派给、创建时间、描述

### Requirement: WF-005 完成者工作台

`/workbench/completer` SHALL 显示所有 `assignedTo === "completer"` 且状态为 `assigned` 或 `in_progress` 的工单（通过 `getTickets()` 获取全部后在客户端过滤），使用 antd `Table`（`pagination={false}`、`scroll={{ x: 'max-content' }}`）展示。标题列 SHALL 为可点击链接（`ellipsis: true`），点击后 SHALL 弹出 antd `Drawer`（宽度 480px）显示工单详情，使用 antd `Descriptions`（`column={1}`、`bordered`、`size="small"`）展示状态（Tag + 中文标签）、创建者、指派给、创建时间、描述。`assigned` 状态的工单操作列有 antd `Button` "开始处理"，`in_progress` 状态的工单操作列有 antd `Button` "完成"。"创建者"和"创建时间"列 SHALL 设置 `responsive: ['lg']`。

#### Scenario: 开始处理工单

- **WHEN** 完成者看到一条 assigned 且 assignedTo 为 "completer" 的工单，点击 "开始处理" Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/start`，成功后列表 SHALL 刷新，工单状态变为 `in_progress`

#### Scenario: 完成工单

- **WHEN** 完成者看到一条 in_progress 的工单，点击 "完成" Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/complete`，成功后列表 SHALL 刷新，工单状态变为 `completed`

#### Scenario: 不显示非自己的工单

- **WHEN** 有一条 assigned 工单，assignedTo 为 "other_person"
- **THEN** 该工单 SHALL 不出现在 antd Table 中

#### Scenario: API 调用失败时显示错误

- **WHEN** 开始处理、完成或获取工单列表时后端返回错误
- **THEN** SHALL 通过 `AntdApp.useApp()` hook 获取的 `message` 实例显示错误提示信息，页面不白屏

#### Scenario: 点击标题弹出 Drawer 查看详情

- **WHEN** 完成者在工单列表中点击某条工单的标题
- **THEN** SHALL 弹出 antd Drawer，使用 Descriptions 展示该工单的状态（Tag）、创建者、指派给、创建时间、描述

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

`apps/web/src/main.tsx` SHALL 用 `BrowserRouter`（v7 的 v6 兼容 API）包裹 `App`，`App.tsx` SHALL 定义路由：`/` → 重定向到 `/login`，`/login` → LoginPage，`/workbench/submitter` → 提交者工作台，`/workbench/dispatcher` → 调度者工作台，`/workbench/completer` → 完成者工作台。未匹配路由 SHALL 用 `Navigate` 重定向到 `/login`。`/workbench/*` 路由需要认证（`AuthProvider` 中 loading 为 false 且 user 不为 null），未认证时重定向到 `/login`。

#### Scenario: 根路由重定向

- **WHEN** 用户访问 `/`
- **THEN** 页面 SHALL 重定向到 `/login`

#### Scenario: 访问无效路由

- **WHEN** 用户访问 `/unknown-path`
- **THEN** 页面 SHALL 重定向到 `/login`

#### Scenario: 未登录访问工作台重定向

- **WHEN** 未登录用户访问 `/workbench/submitter`
- **THEN** 页面 SHALL 重定向到 `/login`

### Requirement: WF-009 Status badge 样式

工单列表中的状态字段 SHALL 使用 antd `Tag` 组件显示，不同状态使用不同 `color` 属性：
- `submitted` → `color="blue"`
- `assigned` → `color="gold"`
- `in_progress` → `color="orange"`
- `completed` → `color="green"`

#### Scenario: 状态显示为 antd Tag

- **WHEN** antd Table 中有状态为 `submitted` 的工单
- **THEN** 状态列 SHALL 渲染为 `<Tag color="blue">submitted</Tag>`

#### Scenario: 所有状态颜色正确

- **WHEN** antd Table 中有 4 条工单，状态分别为 submitted / assigned / in_progress / completed
- **THEN** 状态列 SHALL 分别渲染为 `color="blue"` / `color="gold"` / `color="orange"` / `color="green"` 的 Tag

