## Context

Demo 阶段用 `localStorage`（key: `ticketflow-role`）存储角色名模拟身份切换。`RoleContext` 从 localStorage 读取角色，`RoleSelect` 页面让用户点击角色 Card 后写入 localStorage 并跳转。后端无用户概念，`createdBy` / `assignedTo` 是随意字符串。

当前代码：
- `RoleContext.tsx`：useState + localStorage 管理 role 状态
- `RoleSelect.tsx`：3 个 antd Card，点击后 setRole + navigate
- `Layout.tsx`：Header 显示 "当前角色：xxx" + "切换角色" 按钮（clearRole + navigate('/')）
- `App.tsx`：路由 `/` → RoleSelect，`/workbench/:role` → Layout + 工作台
- `SubmitterWorkbench.tsx`：`createdBy: 'submitter'` 硬编码
- `schema.ts`：仅 tickets 表，无 users 表

## Goals / Non-Goals

**Goals:**

- 建立最小用户认证体系：3 个预置用户，选择即登录，cookie session
- 后端 auth API（login / logout / me）+ auth 中间件（解析 session 注入用户到 Hono context）
- 前端 AuthContext 替代 RoleContext，LoginPage 替代 RoleSelect
- 路由守卫：未登录 → `/login`，已登录按角色跳转工作台
- 工作台 `createdBy` 使用真实登录用户 username
- Header 显示用户 displayName + "退出"按钮

**Non-Goals:**

- 不做密码认证（MVP 阶段选择用户即登录）
- 不做用户注册 / 管理
- 不做 token 刷新 / session 过期处理
- 不做 OAuth / 第三方登录
- 不做服务端权限控制（留给 mvp-permission change）

## Decisions

### D1: 会话策略 — cookie-based session（服务端内存存储）

使用 `Set-Cookie` 设置 session ID（`HttpOnly`、`SameSite=Lax`、`Path=/`），服务端用 `Map<string, { userId: string, createdAt: number }>` 存储在内存中。

**替代方案**: JWT — 需要引入依赖、处理签名密钥、无状态但无法主动失效（logout 困难）。MVP 阶段 3 个用户、单实例部署，内存 session 足够简单。

**替代方案**: localStorage token — 需要前端手动管理 token 拼接、XSS 风险更高。cookie 由浏览器自动携带更自然。

### D2: 登录页 — antd Card 选择用户（与 RoleSelect 类似但数据来源不同）

`/login` 页面展示 3 个 antd Card，每个显示 displayName + role 标签。点击后调用 `POST /api/auth/login`，成功后 cookie 自动设置，前端跳转到对应工作台。

与 Demo 的 RoleSelect 区别：数据来自后端（`GET /api/auth/users` 返回可选用户列表），而非前端硬编码。

### D3: AuthContext — 替代 RoleContext

```typescript
interface AuthContextValue {
  user: User | null        // 当前登录用户（含 id, username, displayName, role）
  loading: boolean         // 正在检查 session
  login: (username: string) => Promise<void>
  logout: () => Promise<void>
}
```

应用启动时调用 `GET /api/auth/me` 检查 cookie session 是否有效。不再使用 localStorage 存角色。

### D4: users 表 schema

| DB 列名 | JS 属性名 | 类型 | 约束 |
|---|---|---|---|
| `id` | `id` | text | PK, UUID |
| `username` | `username` | text | UNIQUE, NOT NULL |
| `display_name` | `displayName` | text | NOT NULL |
| `role` | `role` | text | NOT NULL（submitter/dispatcher/completer）|
| `created_at` | `createdAt` | text | NOT NULL, ISO 8601 |

### D5: Auth API 端点

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/api/auth/users` | 返回可选用户列表（login 页用） | 无需 |
| POST | `/api/auth/login` | `{ username }` → 设置 session cookie | 无需 |
| POST | `/api/auth/logout` | 清除 session + cookie | 需认证 |
| GET | `/api/auth/me` | 返回当前用户信息 | 需认证 |

### D6: Auth 中间件

Hono 中间件，从 cookie 读取 session ID → 查内存 session store → 查 users 表 → 将 User 对象注入 `c.set('user', user)`。

- 无 cookie 或 session 无效：`c.set('user', null)`（不拦截，由路由决定是否需要认证）
- 需要 auth 的路由使用 `requireAuth` 中间件 wrapper，未认证返回 401

Hono 类型声明需扩展 `DbVariables`，新增 `user` 变量：

```typescript
export type AuthVariables = { Variables: { db: Db; user: User | null } }
```

所有使用 auth 中间件的路由类型从 `DbVariables` 改为 `AuthVariables`。

### D7: 路由守卫策略

- `App.tsx` 根路由 `/`：重定向到 `/login`
- `/login`：未登录显示登录页，已登录重定向到 `"/workbench/" + user.role`
- `/workbench/*`：未登录重定向到 `/login`，已登录但角色不匹配也重定向到自己的工作台
- **loading 状态**: AuthContext loading 为 true 时，渲染全局 Spin 或空白页面，不执行路由跳转（避免闪跳到 login 再跳回 workbench）

### D8: createdBy 改造

- 前端 `SubmitterWorkbench` 创建工单时不再传 `createdBy`——后端完全从 auth context 获取
- 前端 `client.ts` 的 `createTicket` 函数删除 `createdBy` 参数，改为 `{ title, description }`
- 后端 `POST /api/tickets` 的 `createdBy` 从 auth context 获取（`c.get('user').username`），完全忽略 request body 中的 createdBy
- 现有 tickets API 需要加 auth 中间件

### D9: 迁移 SQL

users 表迁移使用 `IF NOT EXISTS` 确保幂等性（与项目约定一致）。服务器启动时自动 migrate。

### D10: 测试策略

- **后端 auth 测试**: 测试 login/logout/me 端点的成功和失败场景，beforeEach 清空 users 和 sessions
- **后端 tickets 测试**: 需要先 login 获取 session cookie，测试 createdBy 为当前用户
- **前端测试**: mock auth API 返回固定用户，测试路由守卫和 login 流程
- **测试隔离**: sessions 存储为内存 Map，每次 beforeEach 清空

### D11: 配置管理

- 无新增环境变量
- Session cookie name: `ticketflow-session`
- 无新端口或路径配置

### D12: 开发代理与 CORS

Vite dev proxy 已配置 `/api` → `http://localhost:3000`，`changeOrigin: true`。cookie 在代理模式下由 Vite server 转发，浏览器认为请求是同源的（都来自 localhost:5173），代理层会自动转发 Set-Cookie 和 Cookie 头。

后端 CORS 中间件需配置 `credentials: true`，确保非代理模式（如直接 curl 或 E2E 测试）也能正确设置 cookie：

```typescript
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
```

开发代理模式下浏览器不跨域，CORS 配置不影响；但直接请求后端端口时需要。

### D13: 目录结构

```
packages/shared/src/
├── ticket-types.ts     # 新增 User interface

apps/server/src/
├── db/
│   ├── schema.ts       # 新增 users 表定义
│   └── seed.ts         # 新增预置用户 seed
├── lib/
│   └── sessions.ts     # 新增内存 session store（非 DB 代码，不放 db/）
├── middleware/
│   └── auth.ts         # 新增 auth 中间件（解析 session + requireAuth）
├── routes/
│   └── auth.ts         # 新增 auth API 路由
├── __tests__/
│   ├── auth.test.ts    # 新增 auth API 测试
│   └── sessions.test.ts # 新增 session 存储测试
└── app.ts              # 挂载 auth 路由 + CORS credentials

apps/web/src/
├── context/
│   ├── AuthContext.tsx  # 新增（替代 RoleContext）
│   └── RoleContext.tsx  # 删除
├── pages/
│   ├── LoginPage.tsx   # 新增（替代 RoleSelect）
│   ├── RoleSelect.tsx  # 删除
│   └── SubmitterWorkbench.tsx  # createTicket 不再传 createdBy
├── components/
│   └── Layout.tsx      # 改用 AuthContext
├── api/
│   └── client.ts       # credentials: 'include' + createTicket 删 createdBy
├── App.tsx             # 路由调整
├── main.tsx            # RoleProvider → AuthProvider
└── __tests__/
    ├── LoginPage.test.tsx  # 新增（替代 RoleSelect.test.tsx）
    └── RoleSelect.test.tsx # 删除
```

## Risks / Trade-offs

- **内存 session 不持久** → 服务器重启后所有用户需重新登录。MVP 阶段可接受，后续可迁移到 SQLite 或 Redis。
- **无密码认证** → 任何知道用户名的人都能登录。MVP 演示阶段足够，后续 mvp-permission 可加密码。
- **单实例 session** → 多实例部署时 session 不共享。MVP 单实例无此问题。
- **cookie 在跨域环境** → 开发环境同域（localhost），生产环境同域部署，无跨域问题。

## Open Questions

1. **seed 时机**: 预置用户在 db:seed 脚本中创建。服务器启动时是否需要自动检查并 seed（类似 auto-migrate）？→ 建议在 `pnpm db:seed` 中一次性 seed，服务器启动只做 migrate。
2. **session cookie 安全性**: 是否需要设置 `Secure` 属性？本地开发用 HTTP，设置 Secure 会导致 cookie 不生效。→ MVP 阶段不设 Secure，生产环境由反向代理处理 HTTPS。
