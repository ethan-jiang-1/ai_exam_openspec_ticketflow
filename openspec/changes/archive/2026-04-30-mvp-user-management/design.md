## Context

当前系统有 3 个预置用户（submitter/dispatcher/completer），登录页点选用户卡片即登录，无密码验证。权限系统覆盖 5 个 ticket 操作权限。需要引入 admin 角色进行用户管理，并为所有用户增加密码认证。

## Goals / Non-Goals

**Goals:**
- Admin 用户可增删改查其他用户
- 所有用户登录时需验证密码
- Admin 拥有全部 ticket 权限 + 用户管理权限
- 前端 Admin 工作台提供用户管理界面

**Non-Goals:**
- 自注册 / 公开注册
- 密码找回 / 重置流程
- Session 过期与自动跳转
- 密码复杂度策略
- 登录失败次数限制
- 删除用户时级联处理关联工单（dangling references）
- 工单指派时的 assignee role 校验（仅前端下拉过滤，API 层不限制）

## Decisions

### D1: 密码 Hash — Web Crypto API PBKDF2

使用 `crypto.subtle.deriveBits` + PBKDF2-SHA256，100,000 次迭代，32 字节随机 salt。`password_hash` 列存储格式 `{salt_hex}:{hash_hex}`。

工具函数放在 `apps/server/src/lib/password.ts`，导出 `hashPassword(password: string): Promise<string>` 和 `verifyPassword(password: string, stored: string): Promise<boolean>`。

**选择理由**: Web Crypto API 在 Node.js 和 Cloudflare Workers 双运行时均可用，无需外部依赖。
**备选**: bcrypt（需 native binding，Cloudflare 不兼容）、argon2（同上）。

### D2: Admin 角色 — Role 类型新增 `'admin'`

在现有 `Role` 联合类型中新增 `'admin'` 字面量。Admin 角色拥有全部 5 个 ticket 权限 + `user:manage` 权限。使用已有的 `requirePermission` 中间件。

**选择理由**: 最小化类型系统变更，复用现有权限中间件。

### D3: 登录页 — 卡片 + 密码输入

保持现有用户卡片网格布局，每张卡片下方新增 antd `Input.Password` 和"登录"按钮。点击"登录"时将 username + password 一起提交。

**选择理由**: 保持视觉一致性，用户体验变化最小。
**备选**: 传统表单（username + password），更标准但失去卡片式特色。

### D4: Admin CRUD API — 独立 `/api/admin/users` 路由

在 `apps/server/src/routes/admin.ts` 中实现 admin 用户管理 CRUD，挂载到 `/api/admin/users`。所有端点使用 `requireAuth` + `requirePermission('user:manage')` 保护。

**选择理由**: 路径隔离，与公开的 `GET /api/auth/users` 职责分离。

### D5: 预设用户默认密码

3 个预设用户密码为 `"changeme"`，admin 用户密码为 `"admin"`。Seed 时通过 `hashPassword` 计算 hash 写入。

**选择理由**: 简单直接，文档中明确标注需修改。

### D6: User 类型不暴露 passwordHash

共享 `User` interface 不变，不包含 `passwordHash`。API 响应中 SHAlL 在返回前删除该字段。

**选择理由**: 安全——前端永远不应接触密码 hash。

## Directory Layout

```
packages/shared/src/
  ticket-types.ts           # MODIFIED — Role 新增 'admin'
  index.ts                  # (不变)

apps/server/src/
  lib/
    password.ts             # NEW — hashPassword / verifyPassword
    permissions.ts          # MODIFIED — 新增 user:manage, admin 角色
  middleware/
    auth.ts                 # MODIFIED — sessionMiddleware 查询时排除 passwordHash
  db/
    schema.ts               # MODIFIED — users 表新增 password_hash 列
    seed.ts                 # MODIFIED — admin 用户 + 密码 hash
  routes/
    auth.ts                 # MODIFIED — login 验证密码
    admin.ts                # NEW — admin 用户 CRUD API
  app.ts                    # MODIFIED — 挂载 /api/admin 路由
  __tests__/
    password.test.ts        # NEW — hash/verify 单元测试
    admin.test.ts           # NEW — admin CRUD 集成测试
    auth.test.ts            # MODIFIED — login 测试适配密码

apps/server/drizzle/
  0005_add_password_hash.sql  # NEW — ALTER TABLE users ADD COLUMN password_hash

apps/web/src/
  pages/
    LoginPage.tsx           # MODIFIED — 每张卡片加密码输入框
    AdminWorkbench.tsx      # NEW — 用户管理表格 + 增删改
  api/
    client.ts               # MODIFIED — login 传密码, 新增 admin API
  context/
    AuthContext.tsx          # MODIFIED — login 接受密码参数
  components/
    Layout.tsx              # (不变)
  App.tsx                   # MODIFIED — 新增 /workbench/admin 路由
  __tests__/
    workbench.test.tsx      # MODIFIED — admin 工作台测试

scripts/
  e2e-smoke.mjs             # MODIFIED — login 传密码
```

## 测试数据库策略

- 密码 hash 工具（`password.ts`）: 纯单元测试，不涉及 DB，直接调用 `hashPassword` / `verifyPassword` 验证返回值
- Admin CRUD 集成测试: 内存 SQLite + `beforeEach` 通过 ORM 清空 users 表 + 通过 `POST /api/auth/login`（传 admin 密码）获取 admin session cookie
- Auth 测试: 现有测试适配密码参数，新增"密码错误"场景
- 前端组件测试: mock fetch，验证密码输入框渲染和提交

## 配置管理

无新增环境变量。密码 hash 参数（迭代次数、salt 长度、算法）硬编码在 `password.ts` 常量中，不需要外部配置。

## 开发代理

不变。前端 dev server 代理 `/api/*` 到后端 `localhost:3000`。

## Risks / Trade-offs

- **[R1] Web Crypto API 是异步的** → 所有 hash/verify 必须 `await`。当前 DB 操作是同步的（better-sqlite3），login handler 中需混合同步 DB + 异步 crypto。缓解：Hono handler 本身是 async，无问题。
- **[R2] 默认密码已知** → 安全风险。缓解：MVP 阶段可接受，文档标注。MVP1 加密码修改功能。
- **[R3] Breaking change — login API** → 所有现有客户端/测试需传密码。缓解：本 change 一次性更新所有测试和 e2e 脚本。
- **[R4] admin 可删除自己** → 需要防护。缓解：DELETE 端点 SHALL 拒绝删除 admin 角色用户（包括自己）。
- **[R5] admin 可通过 PATCH 修改自己 role** → admin 可将自己 role 改为 submitter 从而失去管理权限。缓解：MVP 阶段接受此风险；admin 只有一个预置账号，误操作后可通过 seed 恢复。
- **[R6] POST /api/admin/users 可创建 admin 角色用户** → 任何 admin 可创建更多 admin。缓解：MVP 阶段接受；仅一个可信 admin 用户操作。
- **[R7] 用户名枚举** → login API 对"用户不存在"和"密码错误"返回不同错误消息，理论上可枚举系统中存在的用户名。缓解：MVP 阶段仅有 4 个预置账号，用户名公开可见（登录页卡片），无枚举价值。
- **[R8] 删除用户导致 dangling ticket 引用** → tickets 表的 `createdBy` / `assignedTo` 是字符串而非外键，删除用户后已有工单仍引用已删除用户名。缓解：MVP 阶段通过预置账号演示，不删除有工单的用户。Non-Goal for MVP。
- **[R9] Ticket API 可指派给 admin** → `PATCH /api/tickets/:id/assign` 仅校验 targetUser 存在，不检查 role。admin 可被指派工单，且 admin 拥有全部 ticket 权限可完成流转。前端 Dispatcher 下拉仅显示 completer，但 API 层无防护。缓解：MVP 阶段接受；通过 seed 数据规范使用即可。

## Open Questions

1. Admin 编辑用户时，密码字段是必填还是选填？如果留空表示不修改密码？→ 倾向选填：空密码 = 不修改，非空 = 更新密码。
2. 创建用户时如果 username 已存在，返回 400 还是 409？→ 倾向 400（与项目统一错误格式 `{ error: string }`，避免引入新状态码）。
