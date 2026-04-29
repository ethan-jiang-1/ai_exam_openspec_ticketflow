## Why

Demo 阶段用 `localStorage` 存角色名模拟身份切换，没有真实用户概念。MVP 需要让角色身份真正影响入口和动作：后端知道"谁在操作"，前端根据登录状态路由到对应工作台，工作台的 `createdBy` / `assignedTo` 使用真实用户名而非硬编码字符串。这是 MVP 验收标准 #1（最小角色登录/身份区分）和 #2（不同角色登录后进入不同工作台）的核心。

## What Changes

- 新建 `users` 表（id / username / displayName / role / createdAt），Drizzle schema 定义 + 迁移 SQL
- 数据库 seed 脚本插入 3 个预置用户（submitter / dispatcher / completer），每个用户 displayName 为中文（提交者/调度者/完成者）
- 后端新增 auth API：`POST /api/auth/login`（选择用户名即登录，无密码）、`POST /api/auth/logout`、`GET /api/auth/me`
- 后端会话管理：基于 `cookie` 的 session（`HttpOnly`、`SameSite=Lax`），服务端内存存储（MVP 阶段足够）
- 后端新增 auth 中间件：解析 cookie 中的 session，将当前用户注入 Hono context
- 前端新增 `LoginPage` 替换 `RoleSelect`：展示 3 个 antd Card（用户名 + displayName），点击即调用 login API
- 前端 `RoleContext` 重构为 `AuthContext`：从 cookie session 获取用户信息（不再用 localStorage 存角色）
- 前端路由守卫：未登录重定向到 `/login`，已登录按角色重定向到对应工作台
- 前端 `App.tsx` 路由结构调整：`/login` → 登录页，`/workbench/:role` 保持不变
- 前端 API client 自动携带 cookie（`credentials: 'include'`）
- 工作台的 `createdBy` 从硬编码 `"submitter"` 改为使用当前登录用户的 username
- 后端 `POST /api/tickets` 的 `createdBy` 从 request body 改为从 auth context 获取；前端 `createTicket` API 删除 `createdBy` 参数
- 后端 CORS 中间件配置 `credentials: true`，支持前端 cookie 跨端口传递
- 后端 Layout Header 显示当前用户 displayName + "退出"按钮
- 删除 `RoleSelect.tsx` 及其相关代码，删除 `RoleContext.tsx`（被 AuthContext 替代）
- 更新 seed 数据：seed tickets 的 `createdBy` / `assignedTo` 使用预置用户 username
- 测试适配：前端测试使用 mock auth，后端测试覆盖 auth API + session

## Capabilities

### New Capabilities

- `user-auth`: 用户认证体系 — users 表定义、预置用户 seed、auth API（login/logout/me）、session 管理、auth 中间件、登录页、AuthContext、路由守卫

### Modified Capabilities

- `workflow`: WF-001（角色选择页 → 登录页）、WF-002（Header 显示用户名+角色+退出）、WF-003（createdBy 使用真实用户名）、WF-008（路由增加 /login 和守卫）

## Impact

- **新增文件**: `apps/server/src/routes/auth.ts`（auth API 路由）
- **新增文件**: `apps/server/src/middleware/auth.ts`（auth 中间件，解析 session 注入用户）
- **新增文件**: `apps/server/src/lib/sessions.ts`（内存 session 存储，非数据库相关代码，不放 db/ 目录）
- **修改文件**: `apps/server/src/db/schema.ts`（新增 users 表）
- **修改文件**: `apps/server/src/db/types.ts`（新增 AuthVariables 类型，扩展 Hono Variables）
- **修改文件**: `apps/server/src/db/seed.ts`（新增预置用户 seed，更新 ticket seed 使用真实用户名）
- **修改文件**: `apps/server/src/db/migrations/`（新增 users 表迁移 SQL）
- **修改文件**: `apps/server/src/app.ts`（挂载 auth 路由，注册 auth 中间件，CORS 配置 credentials）
- **修改文件**: `apps/server/src/routes/tickets.ts`（createdBy 从 req body 改为从 auth context 获取）
- **新增文件**: `apps/web/src/pages/LoginPage.tsx`（替代 RoleSelect.tsx）
- **新增文件**: `apps/web/src/context/AuthContext.tsx`（替代 RoleContext.tsx）
- **删除文件**: `apps/web/src/pages/RoleSelect.tsx`
- **删除文件**: `apps/web/src/context/RoleContext.tsx`
- **修改文件**: `apps/web/src/App.tsx`（路由调整：/login、路由守卫）
- **修改文件**: `apps/web/src/main.tsx`（RoleProvider → AuthProvider）
- **修改文件**: `apps/web/src/components/Layout.tsx`（Header 使用 AuthContext 显示用户信息）
- **修改文件**: `apps/web/src/api/client.ts`（fetch 添加 credentials: 'include'，createTicket 删除 createdBy 参数）
- **修改文件**: `apps/web/src/pages/SubmitterWorkbench.tsx`（createdBy 从 auth context 获取，createTicket 调用不再传 createdBy）
- **修改文件**: `packages/shared/src/index.ts`（导出 User 类型）
- **修改文件**: `packages/shared/src/ticket-types.ts`（新增 User interface）
- **新增文件**: `apps/server/src/__tests__/auth.test.ts`（auth API 测试）
- **新增文件**: `apps/server/src/__tests__/sessions.test.ts`（session 存储测试）
- **新增文件**: `apps/web/src/__tests__/LoginPage.test.tsx`（登录页测试，替代 RoleSelect.test.tsx）
- **修改文件**: `apps/server/src/__tests__/tickets.test.ts`（适配 auth，测试前先 login 获取 session）
- **修改文件**: `apps/web/src/__tests__/workbench.test.tsx`（改用 AuthContext mock）
- **删除文件**: `apps/web/src/__tests__/RoleSelect.test.tsx`（被 LoginPage.test.tsx 替代）
- **新增依赖**: 无（cookie 由 Hono 内置支持，hono/cookie 提供 getCookie/setCookie）

## Success Criteria

- `pnpm check`（build + test + lint）全部通过
- 数据库包含 3 个预置用户（submitter / dispatcher / completer）
- 访问 `/` 未登录时重定向到 `/login`
- `/login` 页面显示 3 个用户 Card，点击后登录成功并跳转到对应工作台
- 已登录用户访问 `/login` 时自动跳转到其工作台
- Header 显示当前用户 displayName + "退出"按钮
- 点击"退出"后清除 session，跳转回 `/login`
- 工单创建时 `createdBy` 为当前登录用户的 username（非硬编码）
- 后端 auth 中间件对未认证请求返回 401
- 浏览器刷新后 session 保持（cookie-based）
