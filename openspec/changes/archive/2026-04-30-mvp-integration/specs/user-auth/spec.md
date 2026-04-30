## MODIFIED Requirements

### Requirement: UA-005 Auth API — GET /api/auth/users

`GET /api/auth/users` SHALL 返回所有预置用户列表（`[{ username, displayName, role }]`），用于登录页展示可选用户。此端点无需认证。

#### Scenario: 返回用户列表

- **WHEN** 发送 `GET /api/auth/users`
- **THEN** SHALL 返回 200，body 为包含 4 个用户的数组，每个用户包含 username / displayName / role 字段

### Requirement: UA-011 登录页

`/login` 路由 SHALL 显示 `LoginPage` 组件：调用 `GET /api/auth/users` 获取可选用户列表，使用 antd `Row` / `Col`（`xs={24} sm={8}`）+ antd `Card`（`hoverable`）展示每个用户。Card 标题为 displayName，描述为角色中文名（而非英文 key）。每张 Card 内 SHALL 包含 antd `Input.Password` 密码输入框和"登录"按钮。Card SHALL 根据角色显示不同左侧边框颜色。点击"登录"SHALL 将对应 username 和密码输入框的值一起传入 `login(username, password)`，成功后 navigate 到 `"/workbench/" + user.role`。

已登录用户访问 `/login` SHALL 自动跳转到 `"/workbench/" + user.role`。

#### Scenario: 登录页展示用户卡片与密码输入框

- **WHEN** 访问 `/login`
- **THEN** 页面 SHALL 显示 4 个 antd Card，每个 Card 标题为 displayName，描述为中文角色名（提交者/调度者/完成者/管理员），包含 Input.Password 和"登录"按钮

#### Scenario: 输入密码后点击登录成功

- **WHEN** 在"提交者"Card 的密码框输入 "changeme"，点击"登录"
- **THEN** SHALL 调用 `login("submitter", "changeme")`，成功后跳转到 `/workbench/submitter`

#### Scenario: 密码错误显示提示

- **WHEN** 在"提交者"Card 的密码框输入 "wrong"，点击"登录"
- **THEN** SHALL 通过 antd `message.error()` 显示错误提示，页面不跳转

#### Scenario: 已登录用户访问 /login 重定向

- **WHEN** 已登录用户（role=admin）访问 `/login`
- **THEN** 页面 SHALL 自动跳转到 `/workbench/admin`

#### Scenario: API 调用失败时显示错误

- **WHEN** 登录 API 返回错误
- **THEN** SHALL 通过 antd `message.error()` 显示错误提示，页面不白屏
