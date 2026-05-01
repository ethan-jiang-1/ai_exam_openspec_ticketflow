## Context

当前 `sessionMiddleware` 作为全局中间件，对过期 session 无条件返回 401。这导致公开路由（如 `GET /api/auth/users`）在登录页被拦截：登录页调用 `getUsers()` → 401 → 触发 `auth:expired` 事件 → 跳转 `/login?expired=1` → 重新渲染 → 重复，死循环。

根因是 `sessionMiddleware` 承担了两个职责：
1. 解析 session 并注入 user 到 context（读操作，应全局执行）
2. 拒绝过期 session（写操作——返回 401，应仅对受保护路由执行）

## Goals / Non-Goals

**Goals:**
- 公开路由（`/api/auth/users`、`/api/auth/login`）即使携带过期 cookie 也不返回 401
- protected 路由的 401 行为不变（由 `requireAuth` 保证）
- 过期 session 和未登录返回不同的 401 错误消息

**Non-Goals:**
- 不改变 session TTL 逻辑
- 不改变登录/登出流程
- 不引入新的前端路由或页面

## Decisions

### Decision 1: sessionMiddleware 过期时不 401，只标记

**选择**: `sessionMiddleware` 遇到过期 session 时设置 `c.set('user', null)` + `c.set('sessionExpired', true)`，继续 `await next()`。

**替代方案**: 在 `sessionMiddleware` 中检查路由是否公开，公开路由不 401。

**理由**: 在中间件层区分路由是反模式——中间件不应知晓路由配置。将 401 决策交给 `requireAuth` 是关注点分离。

### Decision 2: requireAuth 读取 sessionExpired 区分消息

**选择**: `requireAuth` 检查 `c.get('sessionExpired')`，决定 401 错误消息是"会话已过期，请重新登录"还是"未登录"。

**理由**: 保留过期与未登录的语义区分，对调试和用户体验有价值。

### Decision 3: 前端 handleResponse 在 /login 路径不做 401 拦截

**选择**: `handleResponse` 增加 `!window.location.pathname.startsWith('/login')` 条件，在登录页不触发 `auth:expired`。

**替代方案**: 仅依赖后端修复。

**理由**: 两层防护——后端修复根本因，前端兜底防御。登录页不应因任何 401 而重定向。

## Risks / Trade-offs

- **Risk**: `c.set('sessionExpired', true)` 的类型可能不在 AuthVariables 中 → **Mitigation**: 在 `apps/server/src/db/types.ts` 中扩展 Variables 类型
- **Trade-off**: `sessionExpired` 标记对下游可能无意义的非认证路由也可见 → 影响可忽略，这些路由不读取此标记

## Open Questions

1. `sessionExpired` 字段是否需要加入 `AuthVariables` 类型定义中？当前 Hono Variables 是宽松类型的，直接使用 `c.set` 也能运行，但显式类型声明更规范。
2. 前端路径判断 `window.location.pathname.startsWith('/login')` 是否应改为更精确的 `/login` vs `/login-dev` 分开判断？（当前 `startsWith('/login')` 已覆盖两种登录页）
