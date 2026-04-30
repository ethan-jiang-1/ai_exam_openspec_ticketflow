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
| `created_at` | `createdAt` | text | NOT NULL |

`role` 列 SHALL 仅允许 `submitter`、`dispatcher`、`completer` 三个值。

#### Scenario: users 表可通过 Drizzle ORM 增删改查

- **WHEN** 在 `apps/server` 中执行 `db.select().from(users)`
- **THEN** SHALL 返回用户数组，每个用户包含 id / username / displayName / role / createdAt 字段

### Requirement: UA-002 预置用户 seed

`apps/server/src/db/seed.ts` SHALL 通过 Drizzle ORM 插入 3 个预置用户：

| username | displayName | role |
|---|---|---|
| submitter | 提交者 | submitter |
| dispatcher | 调度者 | dispatcher |
| completer | 完成者 | completer |

id 使用固定 UUID（确保幂等），createdAt 使用 seed 执行时间。seed 脚本 SHALL 在插入前检查用户是否已存在（通过 username 查询），已存在则跳过。

#### Scenario: db:seed 创建 3 个预置用户

- **WHEN** 执行 `pnpm db:seed`
- **THEN** users 表 SHALL 包含 3 条记录，username 分别为 `submitter` / `dispatcher` / `completer`

#### Scenario: 重复 seed 不报错

- **WHEN** 再次执行 `pnpm db:seed`
- **THEN** users 表 SHALL 仍为 3 条记录，无重复插入

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

`apps/server/src/lib/sessions.ts` SHALL 导出 `SessionStore` 类，提供以下方法：

- `create(userId: string): string` — 生成随机 session ID，存储 `{ userId, createdAt }`，返回 session ID
- `get(sessionId: string): { userId: string; createdAt: number } | undefined` — 按 ID 查询
- `destroy(sessionId: string): void` — 删除指定 session
- `clear(): void` — 清空所有 session（测试用）

Session ID SHALL 使用 `crypto.randomUUID()` 生成。

#### Scenario: 创建并查询 session

- **WHEN** 调用 `create('user-123')`
- **THEN** 返回一个 UUID 字符串，随后 `get(id)` SHALL 返回 `{ userId: 'user-123', createdAt: <number> }`

#### Scenario: 删除 session

- **WHEN** 调用 `create('user-1')` 后调用 `destroy(sessionId)`
- **THEN** `get(sessionId)` SHALL 返回 `undefined`

### Requirement: UA-005 Auth API — GET /api/auth/users

`GET /api/auth/users` SHALL 返回所有预置用户列表（`[{ username, displayName, role }]`），用于登录页展示可选用户。此端点无需认证。

#### Scenario: 返回用户列表

- **WHEN** 发送 `GET /api/auth/users`
- **THEN** SHALL 返回 200，body 为包含 3 个用户的数组，每个用户包含 username / displayName / role 字段

### Requirement: UA-006 Auth API — POST /api/auth/login

`POST /api/auth/login` SHALL 接受 `{ username: string }` body，在 users 表查找该用户，创建 session，SHALL 设置 `Set-Cookie` 响应头（name: `ticketflow-session`，value: session ID，`HttpOnly`，`SameSite=Lax`，`Path=/`），SHALL 返回用户信息。

#### Scenario: 登录成功

- **WHEN** 发送 `POST /api/auth/login`，body 为 `{ username: "submitter" }`
- **THEN** SHALL 返回 200，body 为 `{ id, username: "submitter", displayName: "提交者", role: "submitter" }`，响应头 SHALL 包含 `Set-Cookie: ticketflow-session=<uuid>`

#### Scenario: 用户不存在

- **WHEN** 发送 `POST /api/auth/login`，body 为 `{ username: "nonexistent" }`
- **THEN** SHALL 返回 401，body 为 `{ error: "用户不存在" }`

#### Scenario: username 缺失

- **WHEN** 发送 `POST /api/auth/login`，body 为 `{}`
- **THEN** SHALL 返回 400，body 为 `{ error: "username is required" }`

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

1. `sessionMiddleware`：从 cookie 读取 `ticketflow-session`，查 session store 获取 userId，查 users 表获取用户信息，设置 `c.set('user', user | null)`。不拦截请求，仅注入用户信息。
2. `requireAuth`：检查 `c.get('user')` 是否存在，不存在则返回 401 `{ error: "未登录" }`。

`apps/server/src/db/types.ts` SHALL 扩展 Hono Variables 类型，新增 `user` 字段：

```typescript
export type AuthVariables = { Variables: { db: Db; user: User | null } }
```

auth 路由和需要认证的路由 SHALL 使用 `AuthVariables` 类型。

#### Scenario: 有效 session 注入用户

- **WHEN** 请求携带有效 session cookie
- **THEN** `c.get('user')` SHALL 为对应的 User 对象

#### Scenario: 无 session 注入 null

- **WHEN** 请求不携带 session cookie
- **THEN** `c.get('user')` SHALL 为 `null`

#### Scenario: requireAuth 拦截未认证请求

- **WHEN** 未认证请求经过 `requireAuth` 中间件
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
  login: (username: string) => Promise<void>
  logout: () => Promise<void>
}
```

应用启动时调用 `GET /api/auth/me` 检查 session 状态。`login` 调用 `POST /api/auth/login` 后更新 user 状态。`logout` 调用 `POST /api/auth/logout` 后清空 user 状态。所有 auth API 使用 `credentials: 'include'`。

在 `loading === true` 期间（正在调用 `/api/auth/me` 恢复 session），路由守卫 SHALL 不执行跳转，渲染全局 loading 状态（antd `Spin`），避免未确认登录状态就闪跳到 `/login`。

#### Scenario: 应用启动恢复登录状态

- **WHEN** 用户已登录后刷新页面
- **THEN** AuthContext SHALL 通过 `GET /api/auth/me` 恢复 user 状态

#### Scenario: loading 期间不跳转

- **WHEN** AuthContext loading 为 true
- **THEN** 路由守卫 SHALL 不执行重定向，页面 SHALL 显示 loading 状态

#### Scenario: login 成功

- **WHEN** 调用 `login("submitter")`
- **THEN** user SHALL 变为 `{ username: "submitter", displayName: "提交者", role: "submitter" }`

#### Scenario: logout 成功

- **WHEN** 调用 `logout()`
- **THEN** user SHALL 变为 `null`

### Requirement: UA-011 登录页

`/login` 路由 SHALL 显示 `LoginPage` 组件：调用 `GET /api/auth/users` 获取可选用户列表，使用 antd `Row` / `Col`（`xs={24} sm={8}`）+ 3 个 antd `Card`（`hoverable`）展示每个用户。Card 标题为 displayName，描述为角色名。点击 Card 调用 `login(username)` 后 navigate 到 `"/workbench/" + user.role`。

已登录用户访问 `/login` SHALL 自动跳转到 `"/workbench/" + user.role`。

#### Scenario: 登录页展示用户列表

- **WHEN** 访问 `/login`
- **THEN** 页面 SHALL 显示 3 个 antd Card，标题分别为 "提交者"、"调度者"、"完成者"

#### Scenario: 点击 Card 登录并跳转

- **WHEN** 点击 "提交者" Card
- **THEN** SHALL 调用 `POST /api/auth/login`，成功后跳转到 `/workbench/submitter`

#### Scenario: 已登录用户访问 /login 重定向

- **WHEN** 已登录用户（role=dispatcher）访问 `/login`
- **THEN** 页面 SHALL 自动跳转到 `/workbench/dispatcher`

#### Scenario: API 调用失败时显示错误

- **WHEN** 登录 API 返回错误
- **THEN** SHALL 通过 antd `message.error()` 显示错误提示，页面不白屏

#### Scenario: 用户列表 API 失败时显示错误

- **WHEN** `GET /api/auth/users` 返回错误
- **THEN** SHALL 通过 antd `message.error()` 显示错误提示，页面不白屏

### Requirement: UA-012 路由守卫

`App.tsx` SHALL 实现以下路由逻辑：

- `/` → 重定向到 `/login`
- `/login` → LoginPage（未登录时显示，已登录按角色跳转）
- `/workbench/*` → 需要登录，未登录重定向到 `/login`；已登录但访问非自己角色的工作台时，重定向到自己的工作台
- AuthContext `loading === true` 时不执行任何路由跳转，渲染全局 loading 状态

#### Scenario: loading 期间不跳转

- **WHEN** AuthContext loading 为 true 时用户访问 `/workbench/submitter`
- **THEN** 页面 SHALL 显示 loading 状态，不重定向

#### Scenario: 未登录访问工作台重定向

- **WHEN** 未登录用户访问 `/workbench/submitter`
- **THEN** 页面 SHALL 重定向到 `/login`

#### Scenario: 角色不匹配重定向

- **WHEN** role=submitter 的用户访问 `/workbench/dispatcher`
- **THEN** 页面 SHALL 重定向到 `/workbench/submitter`

#### Scenario: 已登录正常访问

- **WHEN** role=submitter 的用户访问 `/workbench/submitter`
- **THEN** 页面 SHALL 正常显示提交者工作台

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

系统 SHALL 在 `apps/server/src/lib/permissions.ts` 中定义 `PERMISSIONS` 常量对象和 `Permission` 类型，包含以下 5 个权限字符串：`ticket:create`、`ticket:assign`、`ticket:start`、`ticket:complete`、`ticket:read`。Permission 类型 SHALL 为这些字符串的字面量联合类型。

#### Scenario: Permission 类型完整性
- **WHEN** 检查 `PERMISSIONS` 对象的所有值
- **THEN** 包含且仅包含 `ticket:create`、`ticket:assign`、`ticket:start`、`ticket:complete`、`ticket:read` 五个字符串

### Requirement: UA-018 角色-权限映射表

系统 SHALL 在 `apps/server/src/lib/permissions.ts` 中定义 `ROLE_PERMISSIONS` 映射（类型为 `Record<Role, Permission[]>`），内容为：
- submitter: `['ticket:create', 'ticket:read']`
- dispatcher: `['ticket:assign', 'ticket:read']`
- completer: `['ticket:start', 'ticket:complete', 'ticket:read']`

#### Scenario: Submitter 权限范围
- **WHEN** 查询 `ROLE_PERMISSIONS['submitter']`
- **THEN** 返回 `['ticket:create', 'ticket:read']`

#### Scenario: Dispatcher 权限范围
- **WHEN** 查询 `ROLE_PERMISSIONS['dispatcher']`
- **THEN** 返回 `['ticket:assign', 'ticket:read']`

#### Scenario: Completer 权限范围
- **WHEN** 查询 `ROLE_PERMISSIONS['completer']`
- **THEN** 返回 `['ticket:start', 'ticket:complete', 'ticket:read']`

#### Scenario: 所有角色都有读权限
- **WHEN** 遍历 `ROLE_PERMISSIONS` 每个角色的权限列表
- **THEN** 每个角色都包含 `ticket:read`

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

