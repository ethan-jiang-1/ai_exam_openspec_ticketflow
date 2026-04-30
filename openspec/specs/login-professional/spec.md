# login-professional Specification

## Purpose
TBD - created by archiving change mvp-login-professional. Update Purpose after archive.
## Requirements
### Requirement: LP-001 正式登录表单 UI

`/login` 路由 SHALL 显示 `LoginPage` 组件，包含：
- 应用标题 "TicketFlow"（h1）
- antd `Form` 包含：
  - `Form.Item` 用户名输入框（antd `Input`，placeholder "请输入用户名"）
  - `Form.Item` 密码输入框（antd `Input.Password`，placeholder "请输入密码"）
  - `Form.Item` 登录按钮（antd `Button type="primary"`，block，文本 "登录"）

页面 SHALL 居中显示（水平垂直居中，minHeight: 100vh）。

#### Scenario: 登录表单渲染

- **WHEN** 未登录用户访问 `/login`
- **THEN** 页面 SHALL 显示 "TicketFlow" 标题、用户名输入框、密码输入框、"登录" 按钮

#### Scenario: 密码输入框遮掩输入

- **WHEN** 用户在密码输入框中输入
- **THEN** 输入内容 SHALL 以圆点遮掩显示

### Requirement: LP-002 表单校验

`LoginPage` SHALL 使用 antd `Form.Item` 的 `rules` 进行客户端校验：

- 用户名：`{ required: true, message: '请输入用户名' }`
- 密码：`{ required: true, message: '请输入密码' }`

表单 SHALL 在提交时触发校验（`validateTrigger: 'onSubmit'`）。校验失败时 SHALL 在对应输入框下方显示红色错误提示，不发起登录请求。

#### Scenario: 用户名为空时提交

- **WHEN** 用户名输入框为空，密码输入框有值，点击"登录"
- **THEN** 用户名输入框下方 SHALL 显示 "请输入用户名"，不发起 API 请求

#### Scenario: 密码为空时提交

- **WHEN** 用户名输入框有值，密码输入框为空，点击"登录"
- **THEN** 密码输入框下方 SHALL 显示 "请输入密码"，不发起 API 请求

### Requirement: LP-003 登录提交与状态

`LoginPage` SHALL 在用户点击"登录"按钮后：

1. 调用 `auth.login(username, password)`
2. 登录按钮显示 loading 状态（`Button loading={true}`）
3. 登录成功：`useEffect` 检测到 `user` 非 null 后 navigate 到 `/workbench/${user.role}`
4. 登录失败：通过 `message.error()` 显示错误信息，按钮恢复可点击状态

#### Scenario: 登录成功跳转

- **WHEN** 输入正确的用户名 "submitter" 和密码 "changeme"，点击"登录"
- **THEN** 登录按钮 SHALL 显示 loading，成功后 SHALL 跳转到 `/workbench/submitter`

#### Scenario: 登录失败显示错误

- **WHEN** 输入用户名 "submitter" 和错误密码 "wrong"，点击"登录"
- **THEN** 登录按钮 SHALL 显示 loading 后恢复，页面 SHALL 通过 `message.error()` 显示错误提示，不跳转

#### Scenario: 登录中按钮禁用

- **WHEN** 点击"登录"按钮后，在 login 完成前
- **THEN** 登录按钮 SHALL 显示 loading 状态，用户无法重复点击

### Requirement: LP-004 Dev 快捷下拉

`LoginPage` SHALL 在开发环境下（`import.meta.env.DEV === true`）底部显示一个视觉上明确标注为"开发模式"的区域，该区域 SHALL 包含：

- 浅色虚线边框容器（`border: '1px dashed #d9d9d9'`，`borderRadius: 8`，`padding: 16`）
- 容器顶部文字标注 "开发模式 (Dev Only)"，灰色小字（`color: '#999'`，`fontSize: 12`）
- 容器内 antd `Select` 下拉，placeholder: "快速选择用户 (Dev)"
- 数据来源：mount 时调用 `getUsers()` API
- 每个选项 label 格式：`{displayName} ({role})`，value 为 `{username}`
- 选择用户后 SHALL 调用 `form.setFieldsValue({ username: selectedUsername })` 填入用户名字段
- 仅填入用户名，不填入密码

`import.meta.env.DEV` 为 false 时（生产构建），整个容器（含标注和下拉）SHALL 被 tree-shaken 移除，不在 bundle 中出现。

#### Scenario: Dev 模式下显示带边框的下拉区域

- **WHEN** 在开发环境访问 `/login`
- **THEN** 页面底部 SHALL 显示虚线边框容器，顶部标注 "开发模式 (Dev Only)"，容器内包含 "快速选择用户 (Dev)" 下拉

#### Scenario: 选择预置用户填入用户名

- **WHEN** 在 dev 下拉中选择 "提交者 (submitter)"
- **THEN** 用户名输入框 SHALL 自动填入 "submitter"，密码框保持为空

#### Scenario: getUsers 失败时下拉为空

- **WHEN** `getUsers()` API 调用失败
- **THEN** 下拉 SHALL 为空（options 为空数组），不影响表单正常使用

#### Scenario: 生产构建不包含 Dev 下拉

- **WHEN** 执行 `vite build` 生产构建
- **THEN** 构建产物中 SHALL NOT 包含 "快速选择用户 (Dev)" 文本和 `getUsers` 调用

### Requirement: LP-005 已登录用户重定向

`LoginPage` SHALL 在组件 mount 后检测 AuthContext 的 `user` 状态：

- 如果 `loading === true`：渲染全局 loading（antd `Spin`，居中）
- 如果 `user !== null`：执行 `navigate('/workbench/${user.role}', { replace: true })`
- 如果 `loading === false && user === null`：渲染登录表单

#### Scenario: 已登录用户访问 /login 重定向

- **WHEN** 已登录用户（role=admin）访问 `/login`
- **THEN** 页面 SHALL 自动跳转到 `/workbench/admin`

#### Scenario: loading 期间显示 loading

- **WHEN** AuthContext 正在恢复 session（loading=true）时访问 `/login`
- **THEN** 页面 SHALL 显示 antd Spin loading，不渲染表单

### Requirement: LP-006 LoginPageDev 调试登录页

`/login-dev` 路由 SHALL 显示 `LoginPageDev` 组件：保留当前卡片式用户选择界面（4 张角色卡片，各自输入密码）。功能与当前 `LoginPage` 完全一致：

- 调用 `GET /api/auth/users` 获取用户列表
- antd Card（hoverable）+ 角色彩色左边框 + hover 阴影
- Card 标题为 displayName，描述为中文角色名
- 每张 Card 内包含 `Input.Password` 和"登录"按钮
- 登录成功后 navigate 到对应工作台
- 已登录用户访问时自动重定向

#### Scenario: 登录页展示用户卡片

- **WHEN** 访问 `/login-dev`
- **THEN** 页面 SHALL 显示 4 张角色卡片，每张包含 displayName、角色描述、密码输入框和登录按钮

#### Scenario: 卡片式登录成功

- **WHEN** 在 "提交者" 卡片的密码框输入 "changeme"，点击"登录"
- **THEN** SHALL 调用 `login("submitter", "changeme")`，成功后跳转到 `/workbench/submitter`

#### Scenario: 卡片式登录密码错误

- **WHEN** 在 "提交者" 卡片的密码框输入 "wrong"，点击"登录"
- **THEN** SHALL 通过 antd `message.error()` 显示错误提示，页面不跳转

#### Scenario: getUsers API 失败时显示错误

- **WHEN** `getUsers()` API 调用失败
- **THEN** SHALL 通过 antd `message.error()` 显示 "获取用户列表失败"，页面不白屏

