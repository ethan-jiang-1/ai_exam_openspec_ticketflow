## MODIFIED Requirements

### Requirement: UA-009 Auth 中间件

`apps/server/src/middleware/auth.ts` SHALL 导出两个中间件：

1. `sessionMiddleware`：
   - 从 cookie 读取 `ticketflow-session`
   - 若 cookie 不存在 → 设置 `c.set('user', null)`，调用 `next()`
   - 若 cookie 存在但 `sessionStore.get()` 返回 `undefined`（session 过期/不存在）→ 设置 `c.set('user', null)` + `c.set('sessionExpired', true)`，调用 `next()`，**SHALL NOT 返回 401**
   - 若 session 有效 → 查 users 表获取用户信息，设置 `c.set('user', user)`
2. `requireAuth`：检查 `c.get('user')` 是否存在，若不存在则检查 `c.get('sessionExpired')`：为 `true` 时返回 401 `{ error: "会话已过期，请重新登录" }`，否则返回 401 `{ error: "未登录" }`。

`apps/server/src/db/types.ts` SHALL 扩展 Hono Variables 类型，新增 `user` 字段和 `sessionExpired` 字段：

```typescript
export type AuthVariables = { Variables: { db: Db; user: User | null; sessionExpired: boolean | undefined } }
```

#### Scenario: 有效 session 注入用户

- **WHEN** 请求携带有效 session cookie
- **THEN** `c.get('user')` SHALL 为对应的 User 对象

#### Scenario: 无 session cookie 注入 null

- **WHEN** 请求不携带 session cookie
- **THEN** `c.get('user')` SHALL 为 `null`，不返回 401

#### Scenario: session 过期继续执行不返回 401

- **WHEN** 请求携带的 session cookie 对应 session 已过期（`Date.now() - createdAt > ttlMs`）
- **THEN** `c.get('user')` SHALL 为 `null`，`c.get('sessionExpired')` SHALL 为 `true`，请求 SHALL 继续执行（不返回 401）

#### Scenario: session 不存在继续执行不返回 401

- **WHEN** 请求携带不存在的 session ID cookie
- **THEN** `c.get('user')` SHALL 为 `null`，`c.get('sessionExpired')` SHALL 为 `true`，请求 SHALL 继续执行（不返回 401）

#### Scenario: 公开路由携带过期 cookie 正常响应

- **WHEN** 请求携带过期 session cookie 访问 `GET /api/auth/users`
- **THEN** SHALL 返回 200 和用户列表，不返回 401

#### Scenario: requireAuth 拦截未认证请求（无 cookie）

- **WHEN** 未认证请求（`c.get('user') === null` 且 `c.get('sessionExpired')` 非 `true`）经过 `requireAuth` 中间件
- **THEN** SHALL 返回 401 `{ error: "未登录" }`

#### Scenario: requireAuth 拦截过期 session 请求

- **WHEN** 过期 session 请求（`c.get('user') === null` 且 `c.get('sessionExpired') === true`）经过 `requireAuth` 中间件
- **THEN** SHALL 返回 401 `{ error: "会话已过期，请重新登录" }`

### Requirement: UA-029 前端全局 401 拦截

`apps/web/src/api/client.ts` SHALL 在任意 API 调用收到 401 响应时，若当前页面路径不是 `/login` 或 `/login-dev`，则 `window.dispatchEvent(new CustomEvent('auth:expired'))`。在 `/login` 或 `/login-dev` 路径上收到 401 时 SHALL NOT 触发 `auth:expired` 事件。

`apps/web/src/context/AuthContext.tsx` SHALL 在 `useEffect` 中监听 `auth:expired` 事件，收到后：
1. 将 `user` 状态设为 `null`
2. 调用 `POST /api/auth/logout`（best-effort，忽略错误）
3. 跳转到 `/login?expired=1`

CustomEvent SHALL 仅在 401 状态码时触发，其他错误状态码（400/403/404/500）SHALL NOT 触发。

#### Scenario: API 返回 401 时触发 auth:expired 事件

- **WHEN** 前端在非登录页调用任意 API（如 `GET /api/auth/me`）返回 401
- **THEN** SHALL dispatch `CustomEvent('auth:expired')` 到 `window`

#### Scenario: 登录页上 API 返回 401 不触发 auth:expired

- **WHEN** 前端在 `/login` 或 `/login-dev` 页面上调用 API 返回 401
- **THEN** SHALL NOT dispatch `auth:expired` 事件

#### Scenario: API 返回 403 时不触发 auth:expired

- **WHEN** 前端调用 `POST /api/tickets` 返回 403
- **THEN** SHALL NOT dispatch `auth:expired` 事件

#### Scenario: AuthContext 收到 auth:expired 后登出并跳转

- **WHEN** AuthContext 监听到 `auth:expired` 事件
- **THEN** user SHALL 变为 `null`，页面 SHALL 跳转到 `/login?expired=1`

#### Scenario: auth:expired 事件只触发一次处理

- **WHEN** 连续 dispatch 两次 `auth:expired` 事件
- **THEN** logout 调用 SHALL 仅执行一次（第二次被去重跳过）
