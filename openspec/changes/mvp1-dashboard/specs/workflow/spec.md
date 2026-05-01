## MODIFIED Requirements

### Requirement: WF-002 共享 Layout

所有 `/workbench/*` 路由和 `/dashboard` 路由 SHALL 使用 antd `Layout` 组件（`Layout` + `Layout.Header` + `Layout.Content`）构建页面骨架。Header 顶部 SHALL 从 `AuthContext` 获取当前用户信息，显示 "{displayName}" 文本、`user.role` 为 `admin` 或 `dispatcher` 时显示 antd `Button` "数据面板" 导航按钮（点击跳转到 `/dashboard`），以及 antd `Button` "退出"按钮。

#### Scenario: 显示当前用户

- **WHEN** submitter 用户以登录状态进入工作台
- **THEN** Layout Header SHALL 显示 "提交者" 文本

#### Scenario: 退出登录

- **WHEN** 用户点击 antd `Button` "退出"
- **THEN** SHALL 调用 `POST /api/auth/logout`，清除 session，页面 SHALL 跳转到 `/login`

#### Scenario: admin 看到数据面板链接

- **WHEN** admin 用户以登录状态进入工作台或 Dashboard
- **THEN** Layout Header SHALL 显示 antd `Button` "数据面板"，点击后跳转到 `/dashboard`

#### Scenario: dispatcher 看到数据面板链接

- **WHEN** dispatcher 用户以登录状态进入工作台或 Dashboard
- **THEN** Layout Header SHALL 显示 antd `Button` "数据面板"，点击后跳转到 `/dashboard`

#### Scenario: submitter 看不到数据面板链接

- **WHEN** submitter 用户以登录状态进入工作台
- **THEN** Layout Header SHALL 不显示 "数据面板" 链接

#### Scenario: completer 看不到数据面板链接

- **WHEN** completer 用户以登录状态进入工作台
- **THEN** Layout Header SHALL 不显示 "数据面板" 链接

### Requirement: WF-008 react-router-dom 路由挂载

`apps/web/src/main.tsx` SHALL 用 `BrowserRouter`（v7 的 v6 兼容 API）包裹 `App`，`App.tsx` SHALL 定义路由：`/` → 重定向到 `/login`，`/login` → LoginPage，`/workbench/submitter` → 提交者工作台，`/workbench/dispatcher` → 调度者工作台，`/workbench/completer` → 完成者工作台，`/workbench/admin` → 管理员工作台，`/dashboard` → DashboardPage（仅 admin 和 dispatcher 可访问，submitter/completer 访问时重定向到 `/workbench/:role`）。未匹配路由 SHALL 用 `Navigate` 重定向到 `/login`。`/workbench/*` 和 `/dashboard` 路由需要认证（`AuthProvider` 中 loading 为 false 且 user 不为 null），未认证时重定向到 `/login`。

#### Scenario: 根路由重定向

- **WHEN** 用户访问 `/`
- **THEN** 页面 SHALL 重定向到 `/login`

#### Scenario: 访问无效路由

- **WHEN** 用户访问 `/unknown-path`
- **THEN** 页面 SHALL 重定向到 `/login`

#### Scenario: 未登录访问工作台重定向

- **WHEN** 未登录用户访问 `/workbench/submitter`
- **THEN** 页面 SHALL 重定向到 `/login`

#### Scenario: admin 访问 Dashboard

- **WHEN** admin 用户已登录，访问 `/dashboard`
- **THEN** 页面 SHALL 渲染 DashboardPage

#### Scenario: dispatcher 访问 Dashboard

- **WHEN** dispatcher 用户已登录，访问 `/dashboard`
- **THEN** 页面 SHALL 渲染 DashboardPage

#### Scenario: submitter 访问 Dashboard 被重定向

- **WHEN** submitter 用户已登录，访问 `/dashboard`
- **THEN** 页面 SHALL 重定向到 `/workbench/submitter`

#### Scenario: completer 访问 Dashboard 被重定向

- **WHEN** completer 用户已登录，访问 `/dashboard`
- **THEN** 页面 SHALL 重定向到 `/workbench/completer`
