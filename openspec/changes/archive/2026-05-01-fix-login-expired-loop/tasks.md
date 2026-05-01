## 1. Backend — sessionMiddleware 不再对过期 session 返回 401 [UA-009]

- [x] 1.1 修改 `apps/server/src/middleware/auth.ts`：`sessionMiddleware` 遇到过期/不存在 session 时，设 `c.set('user', null)` + `c.set('sessionExpired', true)` 并 `await next()`，**不返回 401**
- [x] 1.2 修改 `apps/server/src/middleware/auth.ts`：`requireAuth` 读取 `c.get('sessionExpired')`，区分 401 错误消息（"会话已过期" vs "未登录"）
- [x] 1.3 扩展 `apps/server/src/db/types.ts`：`AuthVariables` 增 `sessionExpired: boolean | undefined` 字段
- [x] 1.4 更新 `apps/server/src/__tests__/auth.test.ts`：新增测试「过期 cookie 访问公开路由 /api/auth/users 返回 200」「过期 cookie 访问受保护路由返回 401 "会话已过期"」「无 cookie 访问受保护路由返回 401 "未登录"」

## 2. Frontend — 登录页不触发 auth:expired 事件 [UA-029]

- [x] 2.1 修改 `apps/web/src/api/client.ts`：`handleResponse` 增加 `!window.location.pathname.startsWith('/login')` 条件
- [x] 2.2 更新 `apps/web/src/__tests__/` 相关测试：验证登录页上 401 不触发 `auth:expired`

## 3. Verification

- [x] 3.1 运行 `pnpm check` 确认 build + test + lint 全绿
- [x] 3.2 手动验证：携带过期 cookie 访问 `http://localhost:5173/login` 不出现 `?expired=1` 死循环
