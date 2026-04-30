# user-auth Delta Specification

## MODIFIED Requirements

### Requirement: UA-011 登录页

`/login` 路由 SHALL 显示 `LoginPage` 组件：使用 antd `Form` + `Input`（用户名）+ `Input.Password`（密码）+ `Button`（登录），专业简洁的表单式登录。`/login-dev` 路由 SHALL 显示 `LoginPageDev` 组件：调用 `GET /api/auth/users` 获取可选用户列表，使用 antd `Row` / `Col`（`xs={24} sm={8}`）+ antd `Card`（`hoverable`）展示每个用户。Card 标题为 displayName，描述为中文角色名。每张 Card 内 SHALL 包含 antd `Input.Password` 密码输入框和"登录"按钮。点击"登录"SHALL 将对应 username 和密码输入框的值一起传入 `login(username, password)`，成功后 navigate 到 `"/workbench/" + user.role`。

已登录用户访问 `/login` 或 `/login-dev` SHALL 自动跳转到 `"/workbench/" + user.role`。

`LoginPage`（正式登录页）：
- 使用 antd `Form` 组件管理表单
- `Form.Item` 包含用户名 `Input`（placeholder "请输入用户名"）和密码 `Input.Password`（placeholder "请输入密码"）
- 登录按钮 `Button type="primary"` block，提交时显示 loading
- Enter 键行为：用户名字段按 Enter → 焦点移至密码框；密码字段按 Enter → 提交表单
- 表单校验：用户名和密码均为必填（`rules: [{ required: true, message: '请输入用户名/密码' }]`）
- 开发环境（`import.meta.env.DEV`）底部显示 `Select` 快捷下拉，选择预置用户后自动填入用户名

`LoginPageDev`（调试登录页）：
- 保留当前卡片式 UI：4 张 antd Card，每张对应一个预置用户
- 角色彩色左边框 + hover 阴影
- Card.Meta title 为 displayName，description 为中文角色名（`ROLE_LABELS[role]`）
- 每张 Card 内包含 `Input.Password` 和"登录"按钮

#### Scenario: 正式登录页展示表单

- **WHEN** 访问 `/login`
- **THEN** 页面 SHALL 显示 "TicketFlow" 标题、用户名输入框、密码输入框、"登录" 按钮

#### Scenario: 正式登录页表单校验

- **WHEN** 在 `/login` 页面，用户名或密码为空时点击"登录"
- **THEN** SHALL 在对应输入框下方显示红色校验错误提示，不发起 API 请求

#### Scenario: 正式登录页登录成功

- **WHEN** 在 `/login` 页面输入正确的用户名 "submitter" 和密码 "changeme"，点击"登录"
- **THEN** SHALL 调用 `login("submitter", "changeme")`，成功后跳转到 `/workbench/submitter`

#### Scenario: 正式登录页密码错误显示提示

- **WHEN** 在 `/login` 页面输入用户名 "submitter" 和错误密码 "wrong"，点击"登录"
- **THEN** SHALL 通过 antd `message.error()` 显示错误提示，页面不跳转

#### Scenario: 正式登录页 Dev 快捷下拉

- **WHEN** 在开发环境访问 `/login`，在底部下拉中选择 "提交者 (submitter)"
- **THEN** 用户名输入框 SHALL 自动填入 "submitter"

#### Scenario: 调试登录页展示用户卡片与密码输入框

- **WHEN** 访问 `/login-dev`
- **THEN** 页面 SHALL 显示 4 个 antd Card，每个 Card 标题为 displayName，描述为中文角色名，包含 Input.Password 和"登录"按钮

#### Scenario: 调试登录页输入密码后点击登录成功

- **WHEN** 在 `/login-dev` 页面的"提交者"Card 密码框输入 "changeme"，点击"登录"
- **THEN** SHALL 调用 `login("submitter", "changeme")`，成功后跳转到 `/workbench/submitter`

#### Scenario: 调试登录页密码错误显示提示

- **WHEN** 在 `/login-dev` 页面的"提交者"Card 密码框输入 "wrong"，点击"登录"
- **THEN** SHALL 通过 antd `message.error()` 显示错误提示，页面不跳转

#### Scenario: 已登录用户访问 /login 重定向

- **WHEN** 已登录用户（role=admin）访问 `/login`
- **THEN** 页面 SHALL 自动跳转到 `/workbench/admin`

#### Scenario: 已登录用户访问 /login-dev 重定向

- **WHEN** 已登录用户（role=admin）访问 `/login-dev`
- **THEN** 页面 SHALL 自动跳转到 `/workbench/admin`

#### Scenario: API 调用失败时显示错误

- **WHEN** 登录 API 返回错误
- **THEN** SHALL 通过 antd `message.error()` 显示错误提示，页面不白屏
