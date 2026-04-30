## ADDED Requirements

### Requirement: UA-021 密码 Hash 工具

`apps/server/src/lib/password.ts` SHALL 导出两个 async 函数：

- `hashPassword(password: string): Promise<string>` — 生成 32 字节随机 salt，使用 `crypto.subtle.deriveBits`（PBKDF2-SHA256，100,000 次迭代，32 字节输出），返回 `{salt_hex}:{hash_hex}` 格式字符串
- `verifyPassword(password: string, stored: string): Promise<boolean>` — 从 stored 解析 salt 和 hash，用相同参数重新派生，比较结果

SHALL NOT 依赖 Node.js 专属模块（如 `import from 'crypto'`），确保 Node.js 和 Cloudflare Workers 双运行时兼容。

#### Scenario: hashPassword 返回 salt:hash 格式

- **WHEN** 调用 `hashPassword('mypassword')`
- **THEN** 返回值 SHALL 为 `{hex_64_chars}:{hex_64_chars}` 格式

#### Scenario: verifyPassword 正确密码返回 true

- **WHEN** 先 `hashPassword('test123')` 获取 stored，再 `verifyPassword('test123', stored)`
- **THEN** SHALL 返回 `true`

#### Scenario: verifyPassword 错误密码返回 false

- **WHEN** 先 `hashPassword('test123')` 获取 stored，再 `verifyPassword('wrong', stored)`
- **THEN** SHALL 返回 `false`

#### Scenario: 相同密码产生不同 hash

- **WHEN** 分别调用 `hashPassword('same')` 两次
- **THEN** 两个返回值 SHALL 不同（因随机 salt）

### Requirement: UA-022 Admin 用户列表 API

`GET /api/admin/users` SHALL 返回所有用户列表（`200`，`User[]`），不包含 `passwordHash` 字段。此端点 SHALL 要求认证且需要 `user:manage` 权限。

#### Scenario: Admin 获取用户列表

- **WHEN** admin 角色用户发送 `GET /api/admin/users`
- **THEN** 响应状态码 SHALL 为 `200`，body 为用户数组，每个用户包含 id / username / displayName / role / createdAt 字段，不包含 passwordHash

#### Scenario: 非 Admin 访问被拒绝

- **WHEN** submitter 角色用户发送 `GET /api/admin/users`
- **THEN** 响应状态码 SHALL 为 `403`，body 为 `{ error: '权限不足' }`

#### Scenario: 未登录访问被拒绝

- **WHEN** 未携带 session cookie 发送 `GET /api/admin/users`
- **THEN** 响应状态码 SHALL 为 `401`

### Requirement: UA-023 Admin 创建用户 API

`POST /api/admin/users` SHALL 接受 JSON body `{ username: string, displayName: string, role: string, password: string }`，创建新用户。密码 SHALL 通过 `hashPassword` hash 后存储。此端点 SHALL 要求认证且需要 `user:manage` 权限。

#### Scenario: 成功创建用户

- **WHEN** admin 发送 `POST /api/admin/users`，body 为 `{ "username": "alice", "displayName": "Alice", "role": "submitter", "password": "pass123" }`
- **THEN** 响应状态码 SHALL 为 `201`，body 包含 `id`（UUID）、`username: "alice"`、`displayName: "Alice"`、`role: "submitter"`、`createdAt`（ISO 8601），不包含 passwordHash

#### Scenario: username 已存在返回 400

- **WHEN** admin 发送 `POST /api/admin/users`，body 中 username 与已有用户重复
- **THEN** 响应状态码 SHALL 为 `400`，body 为 `{ error: '用户名已存在' }`

#### Scenario: 缺少必填字段返回 400

- **WHEN** admin 发送 `POST /api/admin/users`，body 为 `{ "username": "bob" }`（缺少 displayName / role / password）
- **THEN** 响应状态码 SHALL 为 `400`，body 为 `{ error: string }` 格式

#### Scenario: role 非法值返回 400

- **WHEN** admin 发送 `POST /api/admin/users`，body 为 `{ "username": "bob", "displayName": "Bob", "role": "superuser", "password": "pass" }`
- **THEN** 响应状态码 SHALL 为 `400`，body 为 `{ error: string }` 格式

#### Scenario: password 为空返回 400

- **WHEN** admin 发送 `POST /api/admin/users`，body 为 `{ "username": "bob", "displayName": "Bob", "role": "submitter", "password": "" }`
- **THEN** 响应状态码 SHALL 为 `400`，body 为 `{ error: string }` 格式

### Requirement: UA-024 Admin 更新用户 API

`PATCH /api/admin/users/:username` SHALL 接受 JSON body，可更新 `displayName`、`role`、`password` 字段。`password` 为空或不传时表示不修改密码。此端点 SHALL 要求认证且需要 `user:manage` 权限。

#### Scenario: 成功更新 displayName 和 role

- **WHEN** admin 发送 `PATCH /api/admin/users/alice`，body 为 `{ "displayName": "Alice Wang", "role": "dispatcher" }`
- **THEN** 响应状态码 SHALL 为 `200`，body 的 `displayName` 为 `"Alice Wang"`，`role` 为 `"dispatcher"`

#### Scenario: 更新密码

- **WHEN** admin 发送 `PATCH /api/admin/users/alice`，body 为 `{ "password": "newpass" }`
- **THEN** 响应状态码 SHALL 为 `200`，用户下次登录 SHALL 使用新密码

#### Scenario: 不传 password 不修改密码

- **WHEN** admin 发送 `PATCH /api/admin/users/alice`，body 为 `{ "displayName": "New Name" }`
- **THEN** 响应状态码 SHALL 为 `200`，用户原密码 SHALL 不变

#### Scenario: 用户不存在返回 404

- **WHEN** admin 发送 `PATCH /api/admin/users/nonexistent`
- **THEN** 响应状态码 SHALL 为 `404`，body 为 `{ error: '用户不存在' }`

#### Scenario: role 非法值返回 400

- **WHEN** admin 发送 `PATCH /api/admin/users/alice`，body 为 `{ "role": "superuser" }`
- **THEN** 响应状态码 SHALL 为 `400`，body 为 `{ error: string }` 格式

### Requirement: UA-025 Admin 删除用户 API

`DELETE /api/admin/users/:username` SHALL 删除指定用户。SHALL 拒绝删除 `role` 为 `admin` 的用户。此端点 SHALL 要求认证且需要 `user:manage` 权限。

#### Scenario: 成功删除用户

- **WHEN** admin 发送 `DELETE /api/admin/users/alice`（alice 的 role 为 submitter）
- **THEN** 响应状态码 SHALL 为 `200`，body 为 `{ ok: true }`

#### Scenario: 删除 admin 用户被拒绝

- **WHEN** admin 发送 `DELETE /api/admin/users/admin`（admin 的 role 为 admin）
- **THEN** 响应状态码 SHALL 为 `400`，body 为 `{ error: '不能删除管理员用户' }`

#### Scenario: 用户不存在返回 404

- **WHEN** admin 发送 `DELETE /api/admin/users/nonexistent`
- **THEN** 响应状态码 SHALL 为 `404`，body 为 `{ error: '用户不存在' }`

### Requirement: UA-026 Admin 工作台

`/workbench/admin` 路由 SHALL 显示 `AdminWorkbench` 组件：

- 使用 antd `Table` 展示用户列表（columns: username, displayName, role, createdAt, 操作）
- 数据来源：`GET /api/admin/users`（需 admin 认证）
- 操作列包含"编辑"和"删除"按钮
- 页面顶部有"新增用户"按钮，点击弹出 antd `Modal` 表单（username / displayName / role Select / password Input.Password）
- "编辑"按钮弹出 `Modal`（displayName / role Select / password Input.Password 可选填）
- "删除"按钮弹出 antd `Popconfirm` 确认

#### Scenario: 表格显示用户列表

- **WHEN** admin 工作台加载成功
- **THEN** 页面 SHALL 显示 antd Table，包含所有用户的 username / displayName / role / createdAt 列

#### Scenario: 新增用户

- **WHEN** 点击"新增用户"按钮，填写表单后提交
- **THEN** SHALL 调用 `POST /api/admin/users`，成功后刷新用户列表

#### Scenario: 编辑用户

- **WHEN** 点击某用户的"编辑"按钮，修改 displayName 后提交
- **THEN** SHALL 调用 `PATCH /api/admin/users/:username`，成功后刷新用户列表

#### Scenario: 删除用户

- **WHEN** 点击某用户的"删除"按钮，确认后
- **THEN** SHALL 调用 `DELETE /api/admin/users/:username`，成功后刷新用户列表

#### Scenario: API 调用失败时显示错误

- **WHEN** 用户列表 API 返回错误
- **THEN** SHALL 通过 antd `message.error()` 显示错误提示，页面不白屏

### Requirement: UA-027 Admin API 路由挂载与权限保护

`apps/server/src/routes/admin.ts` SHALL 定义 admin CRUD 路由，并使用 `.use('*', requireAuth)` 和 `.use('*', requirePermission('user:manage'))` 施加中间件保护。`apps/server/src/app.ts` SHALL 以 `/api/admin` 前缀挂载此路由。

#### Scenario: 路由可访问

- **WHEN** admin 用户发送 `GET /api/admin/users`
- **THEN** 响应状态码 SHALL 为 `200`（非 404）

#### Scenario: 非 admin 角色被 403 拒绝

- **WHEN** submitter 角色用户发送 `GET /api/admin/users`
- **THEN** 响应状态码 SHALL 为 `403`

### Requirement: UA-028 Session 中间件排除 passwordHash

`apps/server/src/middleware/auth.ts` 的 `sessionMiddleware` SHALL 在查询 users 表时使用 Drizzle column 选择（`.select({ ... })`）显式排除 `passwordHash` 列，或将查询结果解构时丢弃 `passwordHash`，确保 `c.set('user', ...)` 设置的对象不包含 passwordHash 字段。

`GET /api/auth/me` handler 在返回 `c.get('user')` 时 SHALL 显式选择返回字段（id / username / displayName / role），不得直接展开 `c.get('user')` 对象。

#### Scenario: sessionMiddleware 不暴露 passwordHash

- **WHEN** 用户携带有效 session cookie 请求任意受保护路由
- **THEN** `c.get('user')` 对象 SHALL 包含 id / username / displayName / role / createdAt 字段，SHALL NOT 包含 passwordHash 字段

#### Scenario: GET /api/auth/me 不暴露 passwordHash

- **WHEN** 已登录用户发送 `GET /api/auth/me`
- **THEN** 响应 body SHALL 包含 id / username / displayName / role 字段，SHALL NOT 包含 passwordHash 字段

## MODIFIED Requirements

### Requirement: UA-001 users 表定义

`apps/server/src/db/schema.ts` SHALL 定义 `users` 表，列映射如下：

| DB 列名 | JS 属性名 | 类型 | 约束 |
|---|---|---|---|
| `id` | `id` | text | PRIMARY KEY |
| `username` | `username` | text | UNIQUE, NOT NULL |
| `display_name` | `displayName` | text | NOT NULL |
| `role` | `role` | text | NOT NULL |
| `password_hash` | `passwordHash` | text | NOT NULL |
| `created_at` | `createdAt` | text | NOT NULL |

`role` 列 SHALL 仅允许 `submitter`、`dispatcher`、`completer`、`admin` 四个值。

#### Scenario: users 表可通过 Drizzle ORM 增删改查

- **WHEN** 在 `apps/server` 中执行 `db.select().from(users)`
- **THEN** SHALL 返回用户数组，每个用户包含 id / username / displayName / role / passwordHash / createdAt 字段

### Requirement: UA-002 预置用户 seed

`apps/server/src/db/seed.ts` SHALL 通过 Drizzle ORM 插入 4 个预置用户：

| username | displayName | role | password |
|---|---|---|---|
| submitter | 提交者 | submitter | changeme |
| dispatcher | 调度者 | dispatcher | changeme |
| completer | 完成者 | completer | changeme |
| admin | 管理员 | admin | admin |

密码 SHALL 通过 `hashPassword` 计算 hash 后写入 `password_hash` 列。id 使用固定 UUID（确保幂等），createdAt 使用 seed 执行时间。seed 脚本 SHALL 在插入前检查用户是否已存在（通过 username 查询），已存在则跳过。

#### Scenario: db:seed 创建 4 个预置用户

- **WHEN** 执行 `pnpm db:seed`
- **THEN** users 表 SHALL 包含 4 条记录，username 分别为 `submitter` / `dispatcher` / `completer` / `admin`

#### Scenario: 重复 seed 不报错

- **WHEN** 再次执行 `pnpm db:seed`
- **THEN** users 表 SHALL 仍为 4 条记录，无重复插入

#### Scenario: 预置用户密码可验证

- **WHEN** 执行 `pnpm db:seed` 后，使用 `verifyPassword('changeme', user.passwordHash)` 验证 submitter 用户
- **THEN** SHALL 返回 `true`

### Requirement: UA-006 Auth API — POST /api/auth/login

`POST /api/auth/login` SHALL 接受 `{ username: string, password: string }` body，在 users 表查找该用户，使用 `verifyPassword` 验证密码，验证通过后创建 session 并设置 `Set-Cookie` 响应头（name: `ticketflow-session`，value: session ID，`HttpOnly`，`SameSite=Lax`，`Path=/`），SHALL 返回用户信息（不含 passwordHash）。

#### Scenario: 登录成功

- **WHEN** 发送 `POST /api/auth/login`，body 为 `{ username: "submitter", password: "changeme" }`
- **THEN** SHALL 返回 200，body 为 `{ id, username: "submitter", displayName: "提交者", role: "submitter" }`，响应头 SHALL 包含 `Set-Cookie: ticketflow-session=<uuid>`

#### Scenario: 密码错误

- **WHEN** 发送 `POST /api/auth/login`，body 为 `{ username: "submitter", password: "wrong" }`
- **THEN** SHALL 返回 401，body 为 `{ error: "密码错误" }`

#### Scenario: 用户不存在

- **WHEN** 发送 `POST /api/auth/login`，body 为 `{ username: "nonexistent", password: "any" }`
- **THEN** SHALL 返回 401，body 为 `{ error: "用户不存在" }`

#### Scenario: username 缺失

- **WHEN** 发送 `POST /api/auth/login`，body 为 `{ password: "any" }`
- **THEN** SHALL 返回 400，body 为 `{ error: "username is required" }`

#### Scenario: password 缺失

- **WHEN** 发送 `POST /api/auth/login`，body 为 `{ username: "submitter" }`
- **THEN** SHALL 返回 400，body 为 `{ error: "password is required" }`

### Requirement: UA-010 前端 AuthContext

`apps/web/src/context/AuthContext.tsx` SHALL 提供：

```typescript
interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
```

应用启动时调用 `GET /api/auth/me` 检查 session 状态。`login` 调用 `POST /api/auth/login` 并传入 `{ username, password }` 后更新 user 状态。`logout` 调用 `POST /api/auth/logout` 后清空 user 状态。所有 auth API 使用 `credentials: 'include'`。

在 `loading === true` 期间（正在调用 `/api/auth/me` 恢复 session），路由守卫 SHALL 不执行跳转，渲染全局 loading 状态（antd `Spin`），避免未确认登录状态就闪跳到 `/login`。

#### Scenario: login 成功

- **WHEN** 调用 `login("submitter", "changeme")`
- **THEN** user SHALL 变为 `{ username: "submitter", displayName: "提交者", role: "submitter" }`

#### Scenario: login 密码错误

- **WHEN** 调用 `login("submitter", "wrong")`
- **THEN** SHALL 抛出错误，user 保持 `null`

### Requirement: UA-011 登录页

`/login` 路由 SHALL 显示 `LoginPage` 组件：调用 `GET /api/auth/users` 获取可选用户列表，使用 antd `Row` / `Col`（`xs={24} sm={8}`）+ antd `Card`（`hoverable`）展示每个用户。Card 标题为 displayName，描述为角色名。每张 Card 内 SHALL 包含 antd `Input.Password` 密码输入框和"登录"按钮。点击"登录"SHALL 将对应 username 和密码输入框的值一起传入 `login(username, password)`，成功后 navigate 到 `"/workbench/" + user.role`。

已登录用户访问 `/login` SHALL 自动跳转到 `"/workbench/" + user.role`。

#### Scenario: 登录页展示用户卡片与密码输入框

- **WHEN** 访问 `/login`
- **THEN** 页面 SHALL 显示 3 个（或更多）antd Card，每个 Card 标题为 displayName，包含 Input.Password 和"登录"按钮

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

### Requirement: UA-012 路由守卫

`App.tsx` SHALL 实现以下路由逻辑：

- `/` → 重定向到 `/login`
- `/login` → LoginPage（未登录时显示，已登录按角色跳转）
- `/workbench/*` → 需要登录，未登录重定向到 `/login`；已登录但访问非自己角色的工作台时，重定向到自己的工作台
- `/workbench/admin` → AdminWorkbench（仅 admin 角色可访问）
- AuthContext `loading === true` 时不执行任何路由跳转，渲染全局 loading 状态

#### Scenario: admin 用户访问 admin 工作台

- **WHEN** role=admin 的用户访问 `/workbench/admin`
- **THEN** 页面 SHALL 正常显示 AdminWorkbench

#### Scenario: 非 admin 用户访问 admin 工作台被重定向

- **WHEN** role=submitter 的用户访问 `/workbench/admin`
- **THEN** 页面 SHALL 重定向到 `/workbench/submitter`

#### Scenario: loading 期间不跳转

- **WHEN** AuthContext loading 为 true 时用户访问 `/workbench/admin`
- **THEN** 页面 SHALL 显示 loading 状态，不重定向

### Requirement: UA-017 Permission 类型与常量定义

系统 SHALL 在 `apps/server/src/lib/permissions.ts` 中定义 `PERMISSIONS` 常量对象和 `Permission` 类型，包含以下 6 个权限字符串：`ticket:create`、`ticket:assign`、`ticket:start`、`ticket:complete`、`ticket:read`、`user:manage`。Permission 类型 SHALL 为这些字符串的字面量联合类型。

#### Scenario: Permission 类型完整性

- **WHEN** 检查 `PERMISSIONS` 对象的所有值
- **THEN** 包含且仅包含 `ticket:create`、`ticket:assign`、`ticket:start`、`ticket:complete`、`ticket:read`、`user:manage` 六个字符串

### Requirement: UA-018 角色-权限映射表

系统 SHALL 在 `apps/server/src/lib/permissions.ts` 中定义 `ROLE_PERMISSIONS` 映射（类型为 `Record<Role, Permission[]>`），内容为：
- submitter: `['ticket:create', 'ticket:read']`
- dispatcher: `['ticket:assign', 'ticket:read']`
- completer: `['ticket:start', 'ticket:complete', 'ticket:read']`
- admin: `['ticket:create', 'ticket:assign', 'ticket:start', 'ticket:complete', 'ticket:read', 'user:manage']`

#### Scenario: Admin 拥有全部权限

- **WHEN** 查询 `ROLE_PERMISSIONS['admin']`
- **THEN** 返回包含全部 6 个权限的数组

#### Scenario: Admin 包含 user:manage 权限

- **WHEN** 查询 `ROLE_PERMISSIONS['admin']`
- **THEN** SHALL 包含 `'user:manage'`

#### Scenario: 其他角色不包含 user:manage 权限

- **WHEN** 分别查询 `ROLE_PERMISSIONS['submitter']`、`ROLE_PERMISSIONS['dispatcher']`、`ROLE_PERMISSIONS['completer']`
- **THEN** 均不包含 `'user:manage'`
