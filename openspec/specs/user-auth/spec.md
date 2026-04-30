# user-auth Specification

## Purpose
TBD - created by archiving change mvp-user-auth. Update Purpose after archive.
## Requirements
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

### Requirement: UA-003 User 共享类型

`packages/shared/src/ticket-types.ts` SHALL 导出 `User` interface：

```typescript
export interface User {
  id: string
  username: string
  displayName: string
  role: Role
  createdAt: string
}
```

`packages/shared/src/index.ts` SHALL 已通过 `export * from './ticket-types'` 导出此类型。

#### Scenario: User 类型前后端可用

- **WHEN** 在 `apps/web` 或 `apps/server` 中 `import type { User } from '@ticketflow/shared'`
- **THEN** SHALL 获得包含 id / username / displayName / role / createdAt 的类型定义

### Requirement: UA-004 内存 Session 存储

`apps/server/src/lib/sessions.ts` SHALL 导出 `SessionStore` 类，构造时接受可选 `ttlMs` 参数（默认 86,400,000，即 24h）。

Session ID SHALL 通过 `crypto.randomUUID()` 生成。

| 方法 | 行为 |
|------|------|
| `create(userId)` | 存储 `{ userId, createdAt }`，返回 sessionId。调用前 SHALL 执行 `cleanExpired()`。 |
| `get(sessionId)` | 若 session 存在且 `Date.now() - createdAt <= ttlMs`，返回 `SessionData`；若过期，SHALL `delete` 该 session 并返回 `undefined`；若不存在，返回 `undefined` |
| `destroy(sessionId)` | 从 Map 中删除（行为不变） |
| `cleanExpired()` | 遍历 Map，删除所有 `Date.now() - createdAt > ttlMs` 的条目 |
| `clear()` | 清空所有 session（行为不变） |

`create` / `get` / `cleanExpired` 使用 `Date.now()`，SHALL NOT 依赖 Node.js 专属模块。

#### Scenario: 未过期 session 正常获取

- **WHEN** 调用 `store.create('user-1')` 获取 id，立即调用 `store.get(id)`
- **THEN** SHALL 返回 `{ userId: 'user-1', createdAt: <number> }`

#### Scenario: 过期 session 返回 undefined 并被删除

- **WHEN** 创建 ttlMs=1 的 SessionStore，调用 `create('user-1')` 后等待 2ms，再调用 `get(id)`
- **THEN** SHALL 返回 `undefined`，且 Map size 为 0

#### Scenario: create 生成合法 UUID session ID

- **WHEN** 调用 `store.create('user-1')`
- **THEN** SHALL 返回符合 UUID v4 格式的字符串

#### Scenario: destroy 删除 session

- **WHEN** 调用 `store.create('user-1')` 获取 id，调用 `store.destroy(id)`，再调用 `store.get(id)`
- **THEN** SHALL 返回 `undefined`

#### Scenario: cleanExpired 清理过期 session

- **WHEN** 创建 ttlMs=1 的 SessionStore，调用 `create('user-1')` 和 `create('user-2')`，等待 2ms，调用 `cleanExpired()`
- **THEN** Map size SHALL 为 0

#### Scenario: cleanExpired 保留未过期 session

- **WHEN** 创建默认 TTL 的 SessionStore，调用 `create('user-1')`，立即调用 `cleanExpired()`
- **THEN** Map size SHALL 为 1，`get(id)` SHALL 返回有效数据

#### Scenario: clear 清空所有 session

- **WHEN** 调用 `store.create('user-1')` 和 `store.create('user-2')` 后调用 `store.clear()`
- **THEN** 所有后续 `store.get(...)` SHALL 返回 `undefined`

### Requirement: UA-005 Auth API — GET /api/auth/users

`GET /api/auth/users` SHALL 返回所有预置用户列表（`[{ username, displayName, role }]`），用于登录页展示可选用户。此端点无需认证。

#### Scenario: 返回用户列表

- **WHEN** 发送 `GET /api/auth/users`
- **THEN** SHALL 返回 200，body 为包含 4 个用户的数组，每个用户包含 username / displayName / role 字段

### Requirement: UA-006 Auth API — POST /api/auth/login

`POST /api/auth/login` SHALL 接受 `{ username: string, password: string }` body，在 users 表查找该用户，使用 `verifyPassword` 验证密码，验证通过后创建 session 并设置 `Set-Cookie` 响应头（name: `ticketflow-session`，value: session ID，`HttpOnly`，`SameSite=Lax`，`Path=/`，`maxAge=86400`），SHALL 返回用户信息（不含 passwordHash）。

#### Scenario: 登录成功（含 maxAge）

- **WHEN** 发送 `POST /api/auth/login`，body 为 `{ username: "submitter", password: "changeme" }`
- **THEN** SHALL 返回 200，body 为 `{ id, username: "submitter", displayName: "提交者", role: "submitter" }`，响应头 SHALL 包含 `Set-Cookie` 且 cookie 包含 `Max-Age=86400`

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

### Requirement: UA-007 Auth API — POST /api/auth/logout

`POST /api/auth/logout` SHALL 要求认证。从 cookie 读取 session ID，SHALL 删除 session store 中的记录，SHALL 设置 `Set-Cookie` 清除 cookie（`ticketflow-session=; Path=/; Max-Age=0`）。

#### Scenario: 退出成功

- **WHEN** 已登录用户发送 `POST /api/auth/logout`
- **THEN** SHALL 返回 200，body 为 `{ ok: true }`，session SHALL 从 store 中删除，cookie SHALL 被清除

#### Scenario: 未登录时退出

- **WHEN** 未携带 session cookie 发送 `POST /api/auth/logout`
- **THEN** SHALL 返回 401，body 为 `{ error: "未登录" }`

### Requirement: UA-008 Auth API — GET /api/auth/me

`GET /api/auth/me` SHALL 要求认证。从 cookie 读取 session ID，查找用户，SHALL 返回用户信息。

#### Scenario: 已登录查询

- **WHEN** 已登录用户发送 `GET /api/auth/me`（携带 session cookie）
- **THEN** SHALL 返回 200，body 为 `{ id, username, displayName, role }`

#### Scenario: 未登录查询

- **WHEN** 未携带 session cookie 发送 `GET /api/auth/me`
- **THEN** SHALL 返回 401，body 为 `{ error: "未登录" }`

#### Scenario: session 无效

- **WHEN** 携带不存在的 session ID 发送 `GET /api/auth/me`
- **THEN** SHALL 返回 401，body 为 `{ error: "会话已过期" }`

### Requirement: UA-009 Auth 中间件

`apps/server/src/middleware/auth.ts` SHALL 导出两个中间件：

1. `sessionMiddleware`：
   - 从 cookie 读取 `ticketflow-session`
   - **若 cookie 存在**但 `sessionStore.get()` 返回 `undefined`（session 过期/不存在）→ SHALL 返回 401 `{ error: "会话已过期，请重新登录" }`
   - 若 cookie 不存在 → 设置 `c.set('user', null)`，调用 `next()`
   - 若 session 有效 → 查 users 表获取用户信息，设置 `c.set('user', user)`
2. `requireAuth`：检查 `c.get('user')` 是否存在，不存在则返回 401 `{ error: "未登录" }`。

`apps/server/src/db/types.ts` SHALL 扩展 Hono Variables 类型，新增 `user` 字段：

```typescript
export type AuthVariables = { Variables: { db: Db; user: User | null } }
```

#### Scenario: 有效 session 注入用户

- **WHEN** 请求携带有效 session cookie
- **THEN** `c.get('user')` SHALL 为对应的 User 对象

#### Scenario: 无 session cookie 注入 null

- **WHEN** 请求不携带 session cookie
- **THEN** `c.get('user')` SHALL 为 `null`，不返回 401

#### Scenario: session 过期返回 401

- **WHEN** 请求携带的 session cookie 对应 session 已过期（`Date.now() - createdAt > ttlMs`）
- **THEN** SHALL 返回 401 `{ error: "会话已过期，请重新登录" }`

#### Scenario: session 不存在返回 401

- **WHEN** 请求携带不存在的 session ID cookie
- **THEN** SHALL 返回 401 `{ error: "会话已过期，请重新登录" }`

#### Scenario: requireAuth 拦截未认证请求

- **WHEN** 未认证请求（`c.get('user') === null`）经过 `requireAuth` 中间件
- **THEN** SHALL 返回 401 `{ error: "未登录" }`

### Requirement: UA-009.5 CORS credentials 配置

`apps/server/src/app.ts` 的 CORS 中间件 SHALL 配置 `credentials: true` 和 `origin: 'http://localhost:5173'`，确保前端使用 `credentials: 'include'` 时浏览器接受 Set-Cookie 响应头。

#### Scenario: CORS 允许 credentials

- **WHEN** 前端（localhost:5173）向后端（localhost:3000）发送带 `credentials: 'include'` 的请求
- **THEN** 响应头 SHALL 包含 `Access-Control-Allow-Credentials: true` 和 `Access-Control-Allow-Origin: http://localhost:5173`

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

`/login` 路由 SHALL 显示 `LoginPage` 组件：使用 antd `Form` + `Input`（用户名）+ `Input.Password`（密码）+ `Button`（登录），专业简洁的表单式登录。`/login-dev` 路由 SHALL 显示 `LoginPageDev` 组件：调用 `GET /api/auth/users` 获取可选用户列表，使用 antd `Row` / `Col`（`xs={24} sm={8}`）+ antd `Card`（`hoverable`）展示每个用户。Card 标题为 displayName，描述为中文角色名。每张 Card 内 SHALL 包含 antd `Input.Password` 密码输入框和"登录"按钮。点击"登录"SHALL 将对应 username 和密码输入框的值一起传入 `login(username, password)`，成功后 navigate 到 `"/workbench/" + user.role`。

已登录用户访问 `/login` 或 `/login-dev` SHALL 自动跳转到 `"/workbench/" + user.role`。

`LoginPage`（正式登录页）：
- 使用 antd `Form` 组件管理表单
- `Form.Item` 包含用户名 `Input`（placeholder "请输入用户名"）和密码 `Input.Password`（placeholder "请输入密码"）
- 登录按钮 `Button type="primary"` block，提交时显示 loading
- Enter 键行为：用户名字段按 Enter → 焦点移至密码框；密码字段按 Enter → 提交表单
- 表单校验：用户名和密码均为必填（`rules: [{ required: true, message: '请输入用户名/密码' }]`）
- 开发环境（`import.meta.env.DEV`）底部显示虚线边框标注区域，内含 `Select` 快捷下拉，选择预置用户后自动填入用户名

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

- **WHEN** 在开发环境访问 `/login`，在底部虚线边框区域的下拉中选择 "提交者 (submitter)"
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

### Requirement: UA-013 API client 携带 cookie

`apps/web/src/api/client.ts` 中所有 `fetch` 调用 SHALL 添加 `credentials: 'include'`，确保 cookie 自动携带。

#### Scenario: fetch 携带 cookie

- **WHEN** 前端调用 `getTickets()`
- **THEN** fetch 请求 SHALL 携带 `credentials: 'include'`

### Requirement: UA-014 createdBy 使用真实用户

前端 `SubmitterWorkbench` 创建工单时 SHALL 不再传 `createdBy` 字段——后端完全从 auth context 获取。`client.ts` 的 `createTicket` 函数 SHALL 删除 `createdBy` 参数，仅接受 `{ title, description }`。后端 `POST /api/tickets` 的 `createdBy` SHALL 从 auth context（`c.get('user').username`）获取，完全忽略 request body 中的 `createdBy`。

#### Scenario: 前端不传 createdBy

- **WHEN** submitter 用户创建工单
- **THEN** `createTicket` SHALL 传入 `{ title, description }`，不包含 `createdBy`

#### Scenario: 后端使用 auth context

- **WHEN** 后端收到 `POST /api/tickets` 请求，auth context 用户为 submitter
- **THEN** `createdBy` SHALL 为 `"submitter"`（来自 auth context），不使用 request body 中的值

### Requirement: UA-015 Layout Header 使用 AuthContext

`apps/web/src/components/Layout.tsx` SHALL 从 `AuthContext` 获取当前用户信息。Header 显示 `"{displayName}"` + antd `Button` "退出"按钮。点击退出调用 `logout()` 后 navigate 到 `/login`。

#### Scenario: Header 显示用户信息

- **WHEN** submitter 用户进入工作台
- **THEN** Header SHALL 显示 "提交者" + "退出" 按钮

#### Scenario: 退出跳转

- **WHEN** 点击 "退出" 按钮
- **THEN** SHALL 调用 logout，navigate 到 `/login`

### Requirement: UA-016 删除旧文件

`apps/web/src/pages/RoleSelect.tsx` 和 `apps/web/src/context/RoleContext.tsx` SHALL 被删除，其功能由 `LoginPage.tsx` 和 `AuthContext.tsx` 完全替代。`apps/web/src/main.tsx` 中 `RoleProvider` 引用 SHALL 改为 `AuthProvider`。`apps/web/src/App.tsx` 中 `RoleSelect` 引用 SHALL 改为 `LoginPage`。

#### Scenario: 旧文件不存在

- **WHEN** 在 `apps/web/src/` 中搜索
- **THEN** `RoleSelect.tsx` 和 `RoleContext.tsx` SHALL 不存在

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

### Requirement: UA-019 requirePermission 中间件

系统 SHALL 提供 `requirePermission(permission: Permission)` 中间件工厂函数，以及 `getPermissionsForRoles(roles: Role[]): Set<Permission>` 纯函数。该纯函数接收角色数组，遍历每个角色从 `ROLE_PERMISSIONS` 收集权限并去重，返回合并后的权限集。中间件 SHALL 从 Hono context 获取当前用户（`c.get('user')`），将 `user.role` 作为单元素数组传入 `getPermissionsForRoles`，判断返回的权限集是否包含所需权限。不匹配时 SHALL 返回 HTTP 403 与 `{ error: '权限不足' }` JSON 响应。

#### Scenario: 角色拥有所需权限
- **WHEN** 已登录用户（角色为 dispatcher）访问需要 `ticket:assign` 权限的端点
- **THEN** 中间件调用 `next()`，请求继续处理

#### Scenario: 角色缺少所需权限
- **WHEN** 已登录用户（角色为 submitter）访问需要 `ticket:assign` 权限的端点
- **THEN** 返回 HTTP 403，响应体为 `{ error: '权限不足' }`

#### Scenario: 多角色用户拥有其中任一角色的权限即放行
- **WHEN** `getPermissionsForRoles(['submitter', 'dispatcher'])` 被调用
- **THEN** 返回包含 `ticket:create` + `ticket:assign` + `ticket:read` 的权限集

#### Scenario: 多角色用户所有角色均无所需权限时拒绝
- **WHEN** `getPermissionsForRoles(['submitter', 'dispatcher'])` 被调用
- **THEN** 返回的权限集不包含 `ticket:start` 和 `ticket:complete`

### Requirement: UA-020 Tickets 路由权限保护

系统 SHALL 对 tickets 路由的写操作端点施加 `requirePermission` 中间件（在 `requireAuth` 之后）：
- `POST /api/tickets` → `requirePermission('ticket:create')`
- `PATCH /api/tickets/:id/assign` → `requirePermission('ticket:assign')`
- `PATCH /api/tickets/:id/start` → `requirePermission('ticket:start')`
- `PATCH /api/tickets/:id/complete` → `requirePermission('ticket:complete')`

GET 端点（`GET /api/tickets`、`GET /api/tickets/:id`）SHALL 仅使用 `requireAuth`，不施加额外权限检查。

#### Scenario: Submitter 创建工单成功
- **WHEN** submitter 角色用户调用 `POST /api/tickets`
- **THEN** 返回 HTTP 200，工单创建成功

#### Scenario: Dispatcher 创建工单被拒绝
- **WHEN** dispatcher 角色用户调用 `POST /api/tickets`
- **THEN** 返回 HTTP 403，响应体为 `{ error: '权限不足' }`

#### Scenario: Dispatcher 指派工单成功
- **WHEN** dispatcher 角色用户调用 `PATCH /api/tickets/:id/assign`
- **THEN** 返回 HTTP 200，工单指派成功

#### Scenario: Submitter 指派工单被拒绝
- **WHEN** submitter 角色用户调用 `PATCH /api/tickets/:id/assign`
- **THEN** 返回 HTTP 403，响应体为 `{ error: '权限不足' }`

#### Scenario: Completer 开始处理工单成功
- **WHEN** completer 角色用户调用 `PATCH /api/tickets/:id/start`
- **THEN** 返回 HTTP 200，工单状态变为 in_progress

#### Scenario: Submitter 开始处理工单被拒绝
- **WHEN** submitter 角色用户调用 `PATCH /api/tickets/:id/start`
- **THEN** 返回 HTTP 403，响应体为 `{ error: '权限不足' }`

#### Scenario: Completer 完成工单成功
- **WHEN** completer 角色用户调用 `PATCH /api/tickets/:id/complete`
- **THEN** 返回 HTTP 200，工单状态变为 completed

#### Scenario: Dispatcher 完成工单被拒绝
- **WHEN** dispatcher 角色用户调用 `PATCH /api/tickets/:id/complete`
- **THEN** 返回 HTTP 403，响应体为 `{ error: '权限不足' }`

#### Scenario: 所有角色读取工单成功
- **WHEN** 任意已登录角色用户调用 `GET /api/tickets`
- **THEN** 返回 HTTP 200，不检查角色权限

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

### Requirement: UA-029 前端全局 401 拦截

`apps/web/src/api/client.ts` SHALL 在任意 API 调用收到 401 响应时，`window.dispatchEvent(new CustomEvent('auth:expired'))`。

`apps/web/src/context/AuthContext.tsx` SHALL 在 `useEffect` 中监听 `auth:expired` 事件，收到后：
1. 将 `user` 状态设为 `null`
2. 调用 `POST /api/auth/logout`（best-effort，忽略错误）
3. 跳转到 `/login?expired=1`

CustomEvent SHALL 仅在 401 状态码时触发，其他错误状态码（400/403/404/500）SHALL NOT 触发。

#### Scenario: API 返回 401 时触发 auth:expired 事件

- **WHEN** 前端调用任意 API（如 `GET /api/auth/me`）返回 401
- **THEN** SHALL dispatch `CustomEvent('auth:expired')` 到 `window`

#### Scenario: API 返回 403 时不触发 auth:expired

- **WHEN** 前端调用 `POST /api/tickets` 返回 403
- **THEN** SHALL NOT dispatch `auth:expired` 事件

#### Scenario: AuthContext 收到 auth:expired 后登出并跳转

- **WHEN** AuthContext 监听到 `auth:expired` 事件
- **THEN** user SHALL 变为 `null`，页面 SHALL 跳转到 `/login?expired=1`

#### Scenario: auth:expired 事件只触发一次处理

- **WHEN** 连续 dispatch 两次 `auth:expired` 事件
- **THEN** logout 调用 SHALL 仅执行一次（第二次被去重跳过）

### Requirement: UA-030 登录页过期提示

`apps/web/src/pages/LoginPage.tsx` SHALL 检测 URL search params 中 `expired=1` 参数，若存在，在页面加载时通过 antd `message.warning('会话已过期，请重新登录')` 显示提示。

`LoginPageDev` SHALL 同样检测并显示相同提示。

#### Scenario: 带 expired 参数访问登录页显示提示

- **WHEN** 访问 `/login?expired=1`
- **THEN** 页面 SHALL 显示 warning 消息 "会话已过期，请重新登录"

#### Scenario: 不带 expired 参数不显示提示

- **WHEN** 访问 `/login`
- **THEN** SHALL NOT 显示过期提示

#### Scenario: 带 expired 参数访问 dev 登录页显示提示

- **WHEN** 访问 `/login-dev?expired=1`
- **THEN** 页面 SHALL 显示 warning 消息 "会话已过期，请重新登录"

