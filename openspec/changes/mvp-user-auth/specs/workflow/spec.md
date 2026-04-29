## MODIFIED Requirements

### Requirement: WF-001 角色选择页 → 登录页

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
