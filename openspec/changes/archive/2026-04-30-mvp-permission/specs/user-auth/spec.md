## ADDED Requirements

### Requirement: UA-017 Permission 类型与常量定义

系统 SHALL 在 `apps/server/src/lib/permissions.ts` 中定义 `PERMISSIONS` 常量对象和 `Permission` 类型，包含以下 5 个权限字符串：`ticket:create`、`ticket:assign`、`ticket:start`、`ticket:complete`、`ticket:read`。Permission 类型 SHALL 为这些字符串的字面量联合类型。

#### Scenario: Permission 类型完整性
- **WHEN** 检查 `PERMISSIONS` 对象的所有值
- **THEN** 包含且仅包含 `ticket:create`、`ticket:assign`、`ticket:start`、`ticket:complete`、`ticket:read` 五个字符串

### Requirement: UA-018 角色-权限映射表

系统 SHALL 在 `apps/server/src/lib/permissions.ts` 中定义 `ROLE_PERMISSIONS` 映射（类型为 `Record<Role, Permission[]>`），内容为：
- submitter: `['ticket:create', 'ticket:read']`
- dispatcher: `['ticket:assign', 'ticket:read']`
- completer: `['ticket:start', 'ticket:complete', 'ticket:read']`

#### Scenario: Submitter 权限范围
- **WHEN** 查询 `ROLE_PERMISSIONS['submitter']`
- **THEN** 返回 `['ticket:create', 'ticket:read']`

#### Scenario: Dispatcher 权限范围
- **WHEN** 查询 `ROLE_PERMISSIONS['dispatcher']`
- **THEN** 返回 `['ticket:assign', 'ticket:read']`

#### Scenario: Completer 权限范围
- **WHEN** 查询 `ROLE_PERMISSIONS['completer']`
- **THEN** 返回 `['ticket:start', 'ticket:complete', 'ticket:read']`

#### Scenario: 所有角色都有读权限
- **WHEN** 遍历 `ROLE_PERMISSIONS` 每个角色的权限列表
- **THEN** 每个角色都包含 `ticket:read`

### Requirement: UA-019 requirePermission 中间件

系统 SHALL 提供 `requirePermission(permission: Permission)` 中间件工厂函数，以及 `getPermissionsForRoles(roles: Role[]): Set<Permission>` 纯函数。该纯函数接收角色数组，遍历每个角色从 `ROLE_PERMISSIONS` 收集权限并去重，返回合并后的权限集。中间件 SHALL 从 Hono context 获取当前用户（`c.get('user')`），将 `user.role` 作为单元素数组传入 `getPermissionsForRoles`，判断返回的权限集是否包含所需权限。不匹配时 SHALL 返回 HTTP 403 与 `{ error: '权限不足' }` JSON 响应。

#### Scenario: 角色拥有所需权限
- **WHEN** 已登录用户（角色为 dispatcher）访问需要 `ticket:assign` 权限的端点
- **THEN** 中间件调用 `next()`，请求继续处理

#### Scenario: 角色缺少所需权限
- **WHEN** 已登录用户（角色为 submitter）访问需要 `ticket:assign` 权限的端点
- **THEN** 返回 HTTP 403，响应体为 `{ error: '权限不足' }`

#### Scenario: 多角色用户拥有其中任一角色的权限即放行
- **WHEN** `getPermissionsForRoles(['submitter', 'dispatcher'])` 被调用
- **THEN** 返回包含 `ticket:create` + `ticket:assign` + `ticket:read` 的权限集

#### Scenario: 多角色用户所有角色均无所需权限时拒绝
- **WHEN** `getPermissionsForRoles(['submitter', 'dispatcher'])` 被调用
- **THEN** 返回的权限集不包含 `ticket:start` 和 `ticket:complete`

### Requirement: UA-020 Tickets 路由权限保护

系统 SHALL 对 tickets 路由的写操作端点施加 `requirePermission` 中间件（在 `requireAuth` 之后）：
- `POST /api/tickets` → `requirePermission('ticket:create')`
- `PATCH /api/tickets/:id/assign` → `requirePermission('ticket:assign')`
- `PATCH /api/tickets/:id/start` → `requirePermission('ticket:start')`
- `PATCH /api/tickets/:id/complete` → `requirePermission('ticket:complete')`

GET 端点（`GET /api/tickets`、`GET /api/tickets/:id`）SHALL 仅使用 `requireAuth`，不施加额外权限检查。

#### Scenario: Submitter 创建工单成功
- **WHEN** submitter 角色用户调用 `POST /api/tickets`
- **THEN** 返回 HTTP 200，工单创建成功

#### Scenario: Dispatcher 创建工单被拒绝
- **WHEN** dispatcher 角色用户调用 `POST /api/tickets`
- **THEN** 返回 HTTP 403，响应体为 `{ error: '权限不足' }`

#### Scenario: Dispatcher 指派工单成功
- **WHEN** dispatcher 角色用户调用 `PATCH /api/tickets/:id/assign`
- **THEN** 返回 HTTP 200，工单指派成功

#### Scenario: Submitter 指派工单被拒绝
- **WHEN** submitter 角色用户调用 `PATCH /api/tickets/:id/assign`
- **THEN** 返回 HTTP 403，响应体为 `{ error: '权限不足' }`

#### Scenario: Completer 开始处理工单成功
- **WHEN** completer 角色用户调用 `PATCH /api/tickets/:id/start`
- **THEN** 返回 HTTP 200，工单状态变为 in_progress

#### Scenario: Submitter 开始处理工单被拒绝
- **WHEN** submitter 角色用户调用 `PATCH /api/tickets/:id/start`
- **THEN** 返回 HTTP 403，响应体为 `{ error: '权限不足' }`

#### Scenario: Completer 完成工单成功
- **WHEN** completer 角色用户调用 `PATCH /api/tickets/:id/complete`
- **THEN** 返回 HTTP 200，工单状态变为 completed

#### Scenario: Dispatcher 完成工单被拒绝
- **WHEN** dispatcher 角色用户调用 `PATCH /api/tickets/:id/complete`
- **THEN** 返回 HTTP 403，响应体为 `{ error: '权限不足' }`

#### Scenario: 所有角色读取工单成功
- **WHEN** 任意已登录角色用户调用 `GET /api/tickets`
- **THEN** 返回 HTTP 200，不检查角色权限
