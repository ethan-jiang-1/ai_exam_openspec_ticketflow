## Why

sessionMiddleware 作为全局中间件，对过期 session 无条件返回 401，导致公开路由 `/api/auth/users` 在登录页也被拦截。登录页调用 `getUsers()` 收到 401 → 触发 `auth:expired` 事件 → 跳转 `/login?expired=1` → 重新渲染 → 再调 `getUsers()`，形成死循环。

## What Changes

- **sessionMiddleware**: 过期 session 不再返回 401，只设置 `user=null` + `sessionExpired=true`，继续执行后续中间件
- **requireAuth**: 根据 `sessionExpired` 标记返回区分消息（"会话已过期" vs "未登录"），401 仅由 requireAuth 在受保护路由上触发
- **前端 client.ts**: `handleResponse` 在 `/login` 路径不派发 `auth:expired` 事件，作为前端兜底

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `user-auth`: sessionMiddleware 不再对过期 session 返回 401，requireAuth 区分过期/未登录消息

## Impact

| 文件 | 变更 |
|------|------|
| `apps/server/src/middleware/auth.ts` | sessionMiddleware: 过期时设标记不 401；requireAuth: 读取标记决定错误消息 |
| `apps/web/src/api/client.ts` | handleResponse: `/login` 路径跳过 auth:expired 派发 |
