## 1. 共享类型与数据库 Schema

> 依赖：无（首个 task group）

- [x] 1.1 在 `packages/shared/src/ticket-types.ts` 新增 `User` interface（id / username / displayName / role / createdAt）[UA-003]
- [x] 1.2 在 `apps/server/src/db/schema.ts` 新增 `users` 表定义（id → id, username → username, display_name → displayName, role → role, created_at → createdAt），unique 约束在 username 列 [UA-001]
- [x] 1.3 新增 users 表迁移 SQL 文件（IF NOT EXISTS 幂等），确认服务器启动 auto-migrate 可自动应用
- [x] 1.4 验证：`pnpm build` 通过，`users` 表可通过 Drizzle ORM 增删改查

## 2. 预置用户 Seed

> 依赖：1

- [x] 2.1 修改 `apps/server/src/db/seed.ts`：新增 3 个预置用户（submitter/提交者、dispatcher/调度者、completer/完成者），插入前检查 username 是否已存在 [UA-002]
- [x] 2.2 更新现有 seed tickets 的 `createdBy` / `assignedTo` 使用预置用户 username（submitter/dispatcher/completer 替代 alice/bob/charlie）
- [x] 2.3 验证：`pnpm db:seed` 成功，users 表包含 3 条记录，重复执行不报错

## 3. Session 存储

> 依赖：1

- [x] 3.1 新建 `apps/server/src/lib/sessions.ts`：导出 `SessionStore` 类（create / get / destroy / clear 方法），内存 Map 存储 [UA-004]
- [x] 3.2 新建 `apps/server/src/__tests__/sessions.test.ts`：覆盖 create+get、destroy、clear 三个场景 [UA-004]

## 4. Auth 中间件

> 依赖：1, 3

- [x] 4.1 新建 `apps/server/src/middleware/auth.ts`：导出 `sessionMiddleware`（从 cookie 读取 session ID → 查 store → 查 users → 注入 `c.set('user', user|null)`）和 `requireAuth`（检查 user 不为 null，否则 401）。扩展 `apps/server/src/db/types.ts`，新增 `AuthVariables` 类型（包含 `user: User | null`）[UA-009]
- [x] 4.2 在 `apps/server/src/app.ts` 中注册 `sessionMiddleware`（全局），挂载 auth 路由 `/api/auth`，配置 CORS `credentials: true` + `origin: 'http://localhost:5173'` [UA-009.5]
- [x] 4.3 验证：请求无 cookie 时 `c.get('user')` 为 null，有效 session 时为 User 对象

## 5. Auth API

> 依赖：1, 3, 4

- [x] 5.1 新建 `apps/server/src/routes/auth.ts`：实现 `GET /api/auth/users`（返回可选用户列表，无需认证）[UA-005]
- [x] 5.2 实现 `POST /api/auth/login`（接收 `{ username }`，查找用户，创建 session，设置 Set-Cookie）[UA-006]
- [x] 5.3 实现 `POST /api/auth/logout`（requireAuth，删除 session，清除 cookie）[UA-007]
- [x] 5.4 实现 `GET /api/auth/me`（requireAuth，返回当前用户信息）[UA-008]
- [x] 5.5 验证：curl 跑通 login → me → logout 完整流程，login 失败返回 401，me 未登录返回 401

## 6. 后端 tickets 路由改造

> 依赖：4, 5

- [x] 6.1 修改 `apps/server/src/routes/tickets.ts`：`POST /api/tickets` 使用 `requireAuth`，`createdBy` 从 `c.get('user').username` 获取（不再从 request body 读取）[UA-014]
- [x] 6.2 修改 `apps/server/src/routes/tickets.ts`：其他 tickets 路由（GET / PATCH）添加 `requireAuth` 保护
- [x] 6.3 更新 `apps/server/src/__tests__/tickets.test.ts`：测试 beforeEach 先 login 获取 session cookie，验证 createdBy 为当前用户 [UA-014]
- [x] 6.4 验证：`pnpm test` 通过，所有 tickets 测试适配 auth 后绿

## 7. 前端 AuthContext 与 API Client

> 依赖：5

- [x] 7.1 新建 `apps/web/src/context/AuthContext.tsx`：提供 user / loading / login / logout，启动时调用 `GET /api/auth/me` 恢复 session [UA-010]
- [x] 7.2 修改 `apps/web/src/api/client.ts`：所有 fetch 添加 `credentials: 'include'`，`createTicket` 函数删除 `createdBy` 参数 [UA-013, UA-014]
- [x] 7.3 修改 `apps/web/src/main.tsx`：`RoleProvider` 替换为 `AuthProvider` [UA-016]

## 8. 前端登录页

> 依赖：7

- [x] 8.1 新建 `apps/web/src/pages/LoginPage.tsx`：调用 `GET /api/auth/users` 获取用户列表，antd Row/Col（xs={24} sm={8}）+ Card（hoverable）展示用户，点击调用 login 后 navigate 到 `/workbench/:role`，已登录自动跳转 [UA-011]
- [x] 8.2 删除 `apps/web/src/pages/RoleSelect.tsx` [UA-016]

## 9. 前端路由与 Layout 改造

> 依赖：7, 8

- [x] 9.1 修改 `apps/web/src/App.tsx`：`/` 重定向到 `/login`，`/login` → LoginPage，`/workbench/*` 加认证守卫（未登录重定向 `/login`，角色不匹配重定向到自己的工作台），未匹配路由重定向 `/login`。AuthContext loading 为 true 时渲染 antd `Spin`，不执行路由跳转 [UA-012, WF-008]
- [x] 9.2 修改 `apps/web/src/components/Layout.tsx`：从 AuthContext 获取用户信息，Header 显示 `"{displayName}"` + "退出" 按钮 [UA-015, WF-002]
- [x] 9.3 删除 `apps/web/src/context/RoleContext.tsx` [UA-016]

## 10. 前端工作台 createdBy 改造

> 依赖：9

- [x] 10.1 修改 `apps/web/src/pages/SubmitterWorkbench.tsx`：`createTicket` 调用不再传 `createdBy`（后端从 auth context 获取），工单列表过滤条件改为 `createdBy === user.username` [UA-014, WF-003]
- [x] 10.2 验证：登录 submitter 后创建工单，`createdBy` 为 `"submitter"`，列表仅显示自己的工单

## 11. 测试适配

> 依赖：8, 9, 10

- [x] 11.1 后端 auth 测试：`apps/server/src/__tests__/auth.test.ts`，覆盖 login 成功/失败/缺失字段、logout 成功/未登录、me 成功/未登录/session 无效 [UA-005, UA-006, UA-007, UA-008]
- [x] 11.2 前端 `apps/web/src/__tests__/workbench.test.tsx` 适配：测试 wrapper 改用 AuthContext mock（模拟已登录用户），过滤测试使用 mock 用户 username [WF-003]
- [x] 11.3 新建 `apps/web/src/__tests__/LoginPage.test.tsx`：覆盖展示用户列表、点击登录、已登录跳转、用户列表 API 失败显示错误 [UA-011]
- [x] 11.4 删除 `apps/web/src/__tests__/RoleSelect.test.tsx`（被 LoginPage.test.tsx 替代）[UA-016]
- [x] 11.5 验证：`pnpm -r run build && pnpm -r run test` 全部通过

## 12. 集成验证

> 依赖：11

- [x] 12.1 运行 build + test + lint，确认全部通过
- [x] 12.2 完整走通 MVP 登录流程：E2E 烟测脚本自动化验证（`node scripts/e2e-smoke.mjs`，13 步全通过）
- [x] 12.3 验证刷新页面后 session 保持（E2E 烟测 testSessionPersists 步骤验证通过）
