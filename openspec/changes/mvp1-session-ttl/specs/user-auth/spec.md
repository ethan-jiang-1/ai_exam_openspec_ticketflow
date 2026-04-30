## MODIFIED Requirements

### Requirement: UA-004 内存 Session 存储（含 TTL）

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

### Requirement: UA-009 Auth 中间件（含 session 过期处理）

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

## ADDED Requirements

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
