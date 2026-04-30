## Context

当前 auth 体系已完成：sessionMiddleware 注入 user、requireAuth 拦截未登录请求。但所有 requireAuth 保护的端点对任何已登录用户一视同仁——submitter 可以指派工单、completer 可以创建工单。前端通过 WorkbenchGuard 和客户端过滤实现了 UI 层隔离，但服务端没有任何角色检查。

## Goals / Non-Goals

**Goals:**

- API 端点按业务权限（Permission）控制访问，不匹配返回 403
- 角色与权限的映射关系集中管理（ROLE_PERMISSIONS 映射表）
- 前端无需修改（工作台已有通用 403 错误处理，自然覆盖）
- TDD：先写权限矩阵测试和 403 场景测试，再写实现

**Non-Goals:**

- 不做 Dashboard 统计页（下一个 change）
- 不改前端按钮/路由逻辑（已正确）
- 不存权限到 DB（MVP 硬编码映射表）
- 不加新的 Role 或 Permission 超出当前 5 个业务动作
- 不做密码认证

## Decisions

### D1: Permission 中间层 vs 直接 requireRole

**选择**：`requirePermission(permission)` 中间件，而非 `requireRole(roles[])`。

理由：
- 端点声明它需要什么业务能力（`ticket:assign`），不关心哪些角色有这个能力
- 加新角色只改映射表，不扫路由代码
- 多角色用户时，映射表合并权限即可，中间件逻辑不变
- 测试分层：映射表测试（单元）+ 中间件拦截测试（集成），职责清晰

替代方案：`requireRole(['dispatcher'])` — 更简单但绑死角色名，加 admin 要改所有端点。

### D2: 权限定义位置

**选择**：`apps/server/src/lib/permissions.ts`，不进 packages/shared。

理由：
- MVP 阶段前端不需要感知权限模型（按钮已按角色隔离，403 仅做兜底提示）
- 减少跨 workspace 变更
- 将来需要前端感知权限时，再提升到 shared

### D3: Permission 类型设计

**选择**：字符串字面量联合类型 + const 对象。

```ts
const PERMISSIONS = {
  TICKET_CREATE: 'ticket:create',
  TICKET_ASSIGN: 'ticket:assign',
  TICKET_START: 'ticket:start',
  TICKET_COMPLETE: 'ticket:complete',
  TICKET_READ: 'ticket:read',
} as const

type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
```

理由：与现有 `ROLES` / `TICKET_STATUSES` 风格一致，IDE 自动补全友好。

### D4: ROLE_PERMISSIONS 映射表

**选择**：`Record<Role, Permission[]>` 静态常量。

```ts
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  submitter:  ['ticket:create', 'ticket:read'],
  dispatcher: ['ticket:assign', 'ticket:read'],
  completer:  ['ticket:start', 'ticket:complete', 'ticket:read'],
}
```

MVP 三个角色权限互不重叠。GET 端点所有角色都有 `ticket:read` 权限，保持现有行为（所有登录用户可读）。

### D4.5: 多角色用户支持

**选择**：requirePermission 中间件按"合并所有角色的权限集"逻辑实现，而非单角色直查。

MVP 阶段 `users.role` 存单个角色值（如 `'submitter'`），但中间件内部将其视为长度为 1 的数组，遍历每个角色收集权限后去重，再判断是否包含所需权限。这样：
- MVP 行为等价于单角色（数组长度 1，结果不变）
- 将来 `users.role` 改为存多个角色（逗号分隔或关联表）时，只需改中间件获取角色的来源，权限合并逻辑和路由代码完全不动

```ts
// 纯函数：角色数组 → 合并权限集（可独立测试多角色合并）
export function getPermissionsForRoles(roles: Role[]): Set<Permission> {
  return new Set(roles.flatMap(r => ROLE_PERMISSIONS[r] ?? []))
}

// 中间件：组装层（只负责从 context 取 user 并调用纯函数）
function requirePermission(permission: Permission) {
  return async (c, next) => {
    const user = c.get('user')
    const roles: Role[] = [user.role]  // MVP: 单角色; 未来: 拆分为数组
    if (!getPermissionsForRoles(roles).has(permission)) {
      return c.json({ error: '权限不足' }, 403)
    }
    await next()
  }
}
```

### D5: 前端无需修改

**选择**：不改前端代码。

理由：
- 三个工作台（Submitter/Dispatcher/Completer）已有通用 API 错误处理：`catch (e) { message.error(e instanceof Error ? e.message : 'fallback') }`
- 服务端返回 403 `{ error: '权限不足' }` → client.ts `handleResponse` 抛出 `Error('权限不足')` → 工作台 catch 块自然显示"权限不足"
- antd v5 的 `message` 需要 React 上下文（`AntdApp.useApp()`），不能在 client.ts 等非组件文件中直接调用
- 无需引入额外前端改动，无回归风险

### D6: 中间件组合方式

**选择**：`requirePermission` 独立于 `requireAuth`，端点同时使用两者。

```ts
tickets.post('/', requireAuth, requirePermission('ticket:create'), handler)
```

理由：职责单一——requireAuth 检查登录，requirePermission 检查权限。不合并成一个中间件，因为 GET 端点只需 requireAuth（所有角色都有 read 权限）。

### D7: 测试策略

- **单元测试** `permissions.test.ts`：测试 ROLE_PERMISSIONS 映射表的正确性（每个角色有哪些权限、权限不重叠等）
- **集成测试** `tickets.test.ts`：新增 403 场景——用角色 A 的 session 调用角色 B 的端点，验证返回 403
- **E2E** `e2e-smoke.mjs`：现有流程应继续通过（各角色操作在自己的权限范围内）

## Directory Layout

```
apps/server/src/lib/permissions.ts          ← 新增：Permission 类型 + ROLE_PERMISSIONS + requirePermission
apps/server/src/routes/tickets.ts           ← 修改：写端点加 requirePermission
apps/server/src/__tests__/permissions.test.ts ← 新增：权限矩阵单元测试
apps/server/src/__tests__/tickets.test.ts    ← 修改：新增 403 场景测试
```

## Risks / Trade-offs

- **[硬编码映射表]** → MVP 阶段可接受。将来需要动态权限时，只需把 ROLE_PERMISSIONS 改成从 DB 读取，中间件接口不变
- **[前端按钮不隐藏只靠 403 拦截]** → 不会发生。前端已有正确的角色隔离（按钮已按角色隐藏），403 是兜底。两层防护互补
- **[权限粒度太粗]** → MVP 只需 5 个权限，足够覆盖主线流程。未来可细化（如 ticket:read_own vs ticket:read_all）

## Open Questions

1. 将来加 admin 角色时，是给 admin 所有权限，还是需要 admin 专属权限（如 ticket:delete）？这会影响映射表设计
2. 现有 e2e-smoke.mjs 用 submitter 创建工单、dispatcher 指派、completer 完成——权限检查后这些操作恰好都在各自权限内，无需修改。但如果将来新增 E2E 步骤（如用 completer 尝试创建工单验证 403），需要扩展 smoke 脚本
