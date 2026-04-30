## Why

当前所有 API 端点只检查"是否登录"（requireAuth），不检查"登录的是什么角色"。submitter 可以直接调 API 指派工单、completer 可以创建工单——前端只是藏了按钮，后端没有任何拦截。MVP 要求"角色不同，主线动作权限不同"，目前只做到了前端可见性，服务端权限是空白的。

## What Changes

- 新增 Permission 类型 + ROLE_PERMISSIONS 映射表，定义 5 个业务动作权限（ticket:create / ticket:assign / ticket:start / ticket:complete / ticket:read）
- 新增 `requirePermission(permission)` 中间件，检查当前用户角色是否拥有对应权限，不匹配返回 403
- 对 tickets 路由的写操作端点施加权限检查（POST → ticket:create, PATCH assign → ticket:assign, PATCH start → ticket:start, PATCH complete → ticket:complete）
- GET /api/tickets 和 GET /api/tickets/:id 保持所有已登录用户可访问（ticket:read 权限所有角色都有）
- 前端无需修改——工作台已有通用 API 错误处理（`message.error(e.message)`），403 响应会自然显示"权限不足"

**设计原则**：
- API 端点检查的是业务权限（Permission），不是角色名（Role）。角色是权限的分组，映射关系集中管理。将来加新角色、改权限组合只改映射表，不动路由代码。
- 一个用户可以拥有 1~3 个角色。MVP 阶段每个用户只有一个角色（`users.role` 存单个值），但 requirePermission 中间件按"合并所有角色的权限集"逻辑实现，确保多角色场景无需改路由代码。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `user-auth`: 新增 Permission 类型、ROLE_PERMISSIONS 映射表、requirePermission 中间件，tickets 路由增加权限检查

## Impact

- `apps/server/src/lib/permissions.ts` — 新增（Permission 类型 + ROLE_PERMISSIONS 映射 + requirePermission 中间件）
- `apps/server/src/routes/tickets.ts` — 写端点加 requirePermission
- `apps/server/src/__tests__/permissions.test.ts` — 新增权限矩阵 + 中间件测试
- `apps/server/src/__tests__/tickets.test.ts` — 新增 403 场景测试

## Success Criteria

- submitter 调用 PATCH /api/tickets/:id/assign 返回 403
- dispatcher 调用 POST /api/tickets 返回 403
- completer 调用 POST /api/tickets 返回 403
- 各角色在自己权限范围内的操作正常（200）
- `pnpm -r run build && pnpm -r run test` 全部通过
- `node scripts/e2e-smoke.mjs` 全绿（各角色用自己权限内的操作）
