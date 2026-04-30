1## 1. 共享类型与数据库 Schema

> 依赖：无（首个 task group）

- [x] 1.1 在 `packages/shared/src/ticket-types.ts` 的 `ROLES` 常量对象新增 `admin: 'admin'`，确保 `Role` 类型和 `ROLE_LIST` 自动扩展 [UA-001]
- [x] 1.2 在 `apps/server/src/db/schema.ts` 的 `users` 表新增 `passwordHash: text('password_hash').notNull()` 列 [UA-001]
- [x] 1.3 创建 `apps/server/drizzle/0005_add_password_hash.sql`：`ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';` [UA-001]
- [x] 1.4 更新 `apps/server/drizzle/meta/_journal.json`：新增 idx 5（tag `0005_add_password_hash`）的 entry
- [x] 1.5 验证：`pnpm build` 通过，server 和 web 的 import 无报错

## 2. 密码 Hash 工具

> 依赖：无

- [x] 2.1 新建 `apps/server/src/lib/password.ts`：导出 `hashPassword(password: string): Promise<string>`（PBKDF2-SHA256，100k 迭代，32 字节随机 salt，返回 `{salt_hex}:{hash_hex}`）和 `verifyPassword(password: string, stored: string): Promise<boolean>`（解析 stored，重新派生，比较结果）[UA-021]
- [x] 2.2 验证：手动 import 测试 hash/verify 往返通过，两次 hash 相同密码产生不同结果

## 3. 权限扩展

> 依赖：1

- [x] 3.1 在 `apps/server/src/lib/permissions.ts` 的 `PERMISSIONS` 对象新增 `USER_MANAGE: 'user:manage'`，`Permission` 类型自动扩展 [UA-017]
- [x] 3.2 在 `ROLE_PERMISSIONS` 新增 `admin` 条目：`admin: ['ticket:create', 'ticket:assign', 'ticket:start', 'ticket:complete', 'ticket:read', 'user:manage']` [UA-018]
- [x] 3.3 验证：TypeScript 编译通过，`ROLE_PERMISSIONS['admin']` 包含全部 6 个权限

## 4. Auth 中间件 + login API 改造

> 依赖：1, 2

- [x] 4.1 修改 `apps/server/src/middleware/auth.ts` 的 `sessionMiddleware`：查询 users 表时显式选择列并排除 `passwordHash`，或在解构时丢弃该字段，确保 `c.set('user', ...)` 注入的用户对象不含 passwordHash [UA-028]
- [x] 4.2 修改 `apps/server/src/routes/auth.ts` 的 `POST /api/auth/login`：body 改为 `{ username, password }`，校验两者必填（缺失返回 400），查询用户后使用 `verifyPassword` 验证密码，密码不匹配返回 401 `{ error: '密码错误' }`，login 返回用户信息时排除 `passwordHash` [UA-006]
- [x] 4.3 验证：curl 测试 — 正确密码登录成功、错误密码返回 401、缺失字段返回 400；`GET /api/auth/me` 不暴露 passwordHash

## 5. Admin 用户管理 API

> 依赖：1, 2, 3, 4

- [x] 5.1 新建 `apps/server/src/routes/admin.ts`：实现 `GET /api/admin/users`（返回所有用户，排除 passwordHash，需 auth + `user:manage` 权限）[UA-022]
- [x] 5.2 实现 `POST /api/admin/users`（接受 `{ username, displayName, role, password }`，校验必填、role 合法值、password 非空、username 不重复，password 通过 `hashPassword` hash 后写入，返回 201）[UA-023]
- [x] 5.3 实现 `PATCH /api/admin/users/:username`（更新 displayName/role/password，password 为空表示不修改，role 校验合法值，用户不存在返回 404）[UA-024]
- [x] 5.4 实现 `DELETE /api/admin/users/:username`（删除用户，拒绝删除 admin 角色，用户不存在返回 404）[UA-025]
- [x] 5.5 在 `apps/server/src/routes/admin.ts` 中通过 `.use('*', requireAuth)` 和 `.use('*', requirePermission('user:manage'))` 施加中间件保护；在 `apps/server/src/app.ts` 中挂载 admin 路由至 `/api/admin` [UA-027]
- [x] 5.6 验证：curl 测试 CRUD 全流程 — admin 可增删改查用户，非 admin 被 403 拒绝，未登录被 401 拒绝

## 6. Seed 数据更新

> 依赖：1, 2

- [x] 6.1 修改 `apps/server/src/db/seed.ts`：`seedUsers` 数组每项存明文密码字段，循环内 `await hashPassword(password)` 得到 hash 后再插入。为 3 个现有预置用户增加 passwordHash（密码 `changeme`），新增第 4 个 admin 用户（username `admin`，password `admin`）[UA-002]
- [x] 6.2 验证：`pnpm db:seed` 执行成功，4 个用户均可通过正确密码登录

## 7. 前端 AuthContext + API Client

> 依赖：4

- [x] 7.1 修改 `apps/web/src/context/AuthContext.tsx`：`login` 函数签名改为 `(username: string, password: string) => Promise<void>`，body 传 `{ username, password }` [UA-010]
- [x] 7.2 修改 `apps/web/src/api/client.ts`：新增 `getAdminUsers()`、`createUser(data)`、`updateUser(username, data)`、`deleteUser(username)` 四个 admin API 调用函数

## 8. 前端登录页加密码输入

> 依赖：7

- [x] 8.1 修改 `apps/web/src/pages/LoginPage.tsx`：每张用户卡片内新增 antd `Input.Password` 和"登录"按钮；点击"登录"时将 username + 密码框值传入 `login()`；`handleLogin` 改为 `(username: string, password: string)` [UA-011]
- [x] 8.2 验证：登录页渲染密码输入框，正确密码登录成功跳转，错误密码显示 error message

## 9. Admin 工作台

> 依赖：7, 5

- [x] 9.1 修改 `apps/web/src/App.tsx`：新增 `AdminWorkbench` import 和 `/workbench/admin` 路由（在 `ProtectedLayout` + `WorkbenchGuard` 内）[UA-012]
- [x] 9.2 新建 `apps/web/src/pages/AdminWorkbench.tsx`：使用 antd `Table` 展示用户列表（columns: username, displayName, role, createdAt, 操作）；页面顶部"新增用户"按钮 → Modal 表单（username/displayName/role Select/password Input.Password）；"编辑"按钮 → Modal（displayName/role/password 选填）；"删除"按钮 → Popconfirm [UA-026]
- [x] 9.3 验证：admin 登录后可见 AdminWorkbench，可新增/编辑/删除用户，非 admin 角色访问被重定向

## 10. 测试

> 依赖：1-9

- [x] 10.1 新建 `apps/server/src/__tests__/password.test.ts`：覆盖 hashPassword 返回格式、verifyPassword 正确/错误密码、相同密码不同 hash（随机 salt）、异常输入（空字符串）[UA-021]
- [x] 10.2 新建 `apps/server/src/__tests__/admin.test.ts`：覆盖 GET 用户列表（admin 成功/submitter 403/未登录 401）、POST 创建用户（成功/username 重复/缺少字段/非法 role/空 password）、PATCH 更新用户（成功/更新密码/不传密码保持原密码/用户不存在/非法 role）、DELETE 删除用户（成功/拒绝删除 admin/用户不存在）[UA-022, UA-023, UA-024, UA-025, UA-027]
- [x] 10.3 修改 `apps/server/src/__tests__/auth.test.ts`：login helper 改为传 `{ username, password }`，新增密码错误返回 401、password 缺失返回 400 测试用例，现有测试适配密码参数 [UA-006]
- [x] 10.4 修改 `apps/server/src/__tests__/permissions.test.ts`：更新权限数量断言（5→6），新增 admin 角色权限测试（含全部 6 个权限、含 user:manage），角色遍历测试加上 admin [UA-017, UA-018]
- [x] 10.5 修改 `apps/web/src/__tests__/workbench.test.tsx`：新增 AdminWorkbench 测试（表格渲染用户列表、新增用户按钮弹出 Modal、删除 Popconfirm），mock fetch 返回 admin 用户和用户列表
- [x] 10.6 修改 `apps/web/src/__tests__/LoginPage.test.tsx`：适配密码登录 — 卡片内新增密码输入框和登录按钮，mock login 请求需包含 `{ username, password }`，"calls login on card click" 测试改为输入密码后点击登录按钮

## 11. E2E + 全量验证

> 依赖：1-10

- [x] 11.1 修改 `scripts/e2e-smoke.mjs`：所有 `testLogin` 调用改为传 `{ username, password }`（如 `{ username: 'submitter', password: 'changeme' }`），新增 admin 登录 + 用户 CRUD 测试步骤，`testLoginFail` 增加密码错误场景 [UA-006]
- [x] 11.2 验证：`pnpm check` 全绿（build + test + lint）
- [x] 11.3 验证：`node scripts/e2e-smoke.mjs` 全绿
- [x] 11.4 自动化验证：UI CRUD 测试覆盖创建/编辑/删除全流程，e2e 覆盖 admin CRUD + 密码变更后登录
