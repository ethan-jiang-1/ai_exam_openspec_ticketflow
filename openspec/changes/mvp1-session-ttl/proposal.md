## Why

当前 session 无过期时间——一旦登录，session 永久有效。Cookie 也没有 maxAge，浏览器关闭后 session 才消失。这不符合安全最佳实践，也无法处理"会话过期"的用户体验。MVP1 的首要任务是补上这个安全缺口。

## What Changes

- SessionStore 增加 24h TTL：`get()` 时检查 `createdAt`，超过 24h 自动删除并返回 `undefined`
- 登录时 cookie 设置 `maxAge: 86400`（24h），与 session TTL 一致
- `sessionMiddleware` 区分"无 cookie"和"session 过期"两种情况，过期返回 401 `{ error: "会话已过期，请重新登录" }`
- 前端 AuthContext 增加全局 401 拦截：任何 API 返回 401 时自动登出并跳转 `/login`，显示"会话已过期，请重新登录"提示
- SessionStore 增加过期 session 清理方法，避免内存泄漏

## Capabilities

### Modified Capabilities

- `user-auth`: SessionStore 增加 TTL 过期逻辑(UA-004)、Cookie 增加 maxAge(UA-006)、sessionMiddleware 区分过期/未登录(UA-009)、前端全局 401 拦截 + 登录页过期提示(UA-029, UA-030)

## Impact

| 层级 | 文件 | 变更 |
|------|------|------|
| 后端 lib | `apps/server/src/lib/sessions.ts` | SessionStore 增加 TTL 参数 + get() 过期检查 + `cleanExpired()` |
| 后端路由 | `apps/server/src/routes/auth.ts` | login 的 setCookie 增加 `maxAge: 86400` |
| 后端中间件 | `apps/server/src/middleware/auth.ts` | sessionMiddleware：session 过期时返回 401 而非设置 user=null |
| 前端 context | `apps/web/src/context/AuthContext.tsx` | 监听 `auth:expired` CustomEvent，自动 logout + 跳转 `/login?expired=1` |
| 前端页面 | `apps/web/src/pages/LoginPage.tsx` | 检测 `?expired=1` 参数，显示过期提示 |
| 前端页面 | `apps/web/src/pages/LoginPageDev.tsx` | 同上 |
| 测试 | `apps/server/src/__tests__/sessions.test.ts` | 增加 TTL 过期 + cleanExpired 测试 |
| 测试 | `apps/server/src/__tests__/auth.test.ts` | 增加 session 过期 401 测试 |
| 测试 | `apps/web/src/__tests__/AuthContext.test.tsx` | 新增 401 拦截测试 |
| 测试 | `apps/web/src/__tests__/LoginPage.test.tsx` | 增加 `?expired=1` 过期提示测试 |
| 测试 | `apps/web/src/__tests__/LoginPageDev.test.tsx` | 同上 |
