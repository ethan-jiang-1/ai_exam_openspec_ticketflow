## Why

当前登录无密码，仅 3 个预置账号点选即登。缺少管理员角色，无法动态增删改用户。需要引入密码认证和管理员用户管理，使身份体系从"演示级"升级到"可用级"。

## What Changes

- Role 类型新增 `admin` 值，seed 新增 1 个 admin 预置账号
- users 表新增 `password_hash` 列（text, not null），预置用户设默认占位密码
- **BREAKING**: `POST /api/auth/login` 从 `{ username }` 改为 `{ username, password }`，需验证密码
- 新增 admin-only 用户 CRUD API：`GET /api/admin/users`、`POST /api/admin/users`、`PATCH /api/admin/users/:username`、`DELETE /api/admin/users/:username`
- admin 角色 SHALL 拥有所有 ticket 权限 + 用户管理权限
- 前端登录页新增密码输入框
- 新增 Admin 工作台页面：用户列表 + 增删改操作

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `user-auth`: 新增 admin 角色、密码认证、用户 CRUD API、admin 工作台。涉及 UA-001（users 表新增列）、UA-002（seed 新增 admin）、UA-003（User 类型变更）、UA-006（login 加密码）、UA-010（AuthContext 传密码）、UA-011（登录页加密码框）、UA-012（路由新增 admin）、UA-017/018/019/020（权限扩展 admin 角色），以及新增 requirement（admin CRUD API、admin 工作台、密码 hash 工具）

## Impact

- `packages/shared/src/ticket-types.ts` — Role 类型新增 `'admin'`
- `apps/server/src/db/schema.ts` — users 表新增 `password_hash` 列
- `apps/server/drizzle/` — 新增迁移 SQL 文件
- `apps/server/src/lib/permissions.ts` — ROLE_PERMISSIONS 新增 admin 映射
- `apps/server/src/middleware/auth.ts` — sessionMiddleware 查询 users 表时排除 passwordHash
- `apps/server/src/routes/auth.ts` — login handler 验证密码
- `apps/server/src/routes/admin.ts`（新增）— admin CRUD API 路由
- `apps/server/src/lib/password.ts`（新增）— 密码 hash/verify 工具
- `apps/server/src/db/seed.ts` — 新增 admin seed 用户
- `apps/web/src/pages/LoginPage.tsx` — 新增密码输入框
- `apps/web/src/pages/AdminWorkbench.tsx`（新增）— admin 用户管理工作台
- `apps/web/src/api/client.ts` — 新增 admin API 调用函数
- `apps/web/src/App.tsx` — 新增 `/workbench/admin` 路由
- `apps/web/src/__tests__/workbench.test.tsx` — 新增 admin 相关测试
- `apps/web/src/__tests__/LoginPage.test.tsx` — 适配密码输入框

## Success Criteria

- `pnpm check` 全绿（build + test + lint）
- admin 用户可登录并看到管理工作台
- admin 可创建/编辑/删除非 admin 用户
- 非 admin 用户登录后无法访问 admin API（403）
- 预置用户（submitter/dispatcher/completer）使用默认密码可正常登录
- `scripts/e2e-smoke.mjs` 适配密码登录后全绿
