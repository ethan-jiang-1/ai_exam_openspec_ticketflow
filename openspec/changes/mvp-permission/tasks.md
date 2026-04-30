## 1. 权限模型定义与单元测试（TDD Red）

> 依赖：无

- [ ] 1.1 先写 `apps/server/src/__tests__/permissions.test.ts`：
  - ROLE_PERMISSIONS 映射表正确性（submitter 有 create+read、dispatcher 有 assign+read、completer 有 start+complete+read、所有角色都有 read） [UA-017, UA-018]
  - getPermissionsForRoles 纯函数测试（单角色、多角色合并放行、多角色均无权限拒绝） [UA-019]
  - requirePermission 中间件单元测试（mock Hono context，验证拥有权限时调用 next、缺少权限时返回 403） [UA-019]
- [ ] 1.2 运行测试确认失败（Red）——因为 permissions.ts 尚不存在
- [ ] 1.3 创建 `apps/server/src/lib/permissions.ts`：定义 PERMISSIONS 常量、Permission 类型、ROLE_PERMISSIONS 映射表、getPermissionsForRoles 纯函数（接收 Role[] 返回合并权限集）、requirePermission 中间件工厂函数 [UA-017, UA-018, UA-019]
- [ ] 1.4 运行测试确认通过（Green）
- [ ] 1.5 验证：`pnpm -r run build` 编译通过

## 2. Tickets 路由权限保护与集成测试（TDD Red）

> 依赖：1

- [ ] 2.1 重构 `apps/server/src/__tests__/tickets.test.ts` 测试基础设施：beforeEach 中插入 submitter/dispatcher/completer 三个用户，现有 assign/start/complete 测试改用正确角色的 session（assign 用 dispatcher，start/complete 用 completer）。此时不加 requirePermission，测试应仍全部通过 [UA-020]
- [ ] 2.2 在同一文件中新增 403 场景测试：用各角色的 session 调用无权限端点，验证返回 403 + `{ error: '权限不足' }` [UA-020]
  - submitter → PATCH /assign（403）
  - submitter → PATCH /start（403）
  - dispatcher → POST /tickets（403）
  - dispatcher → PATCH /complete（403）
  - completer → POST /tickets（403）
- [ ] 2.3 运行测试确认 403 场景失败（Red）——因为路由尚未加 requirePermission
- [ ] 2.4 修改 `apps/server/src/routes/tickets.ts`：4 个写端点在 requireAuth 之后添加 requirePermission（POST → ticket:create, PATCH assign → ticket:assign, PATCH start → ticket:start, PATCH complete → ticket:complete） [UA-020]
- [ ] 2.5 运行测试确认全部通过（Green）——包括重构后的现有测试 + 新增 403 测试
- [ ] 2.6 检查 `apps/server/src/__tests__/integration.test.ts`：如果也用单角色做全流程，同样需要改为多角色 [UA-020]

## 3. 全量验证

> 依赖：2

- [ ] 3.1 验证：`pnpm -r run build && pnpm -r run test` 全部通过
- [ ] 3.2 验证：`node scripts/e2e-smoke.mjs` 全绿
