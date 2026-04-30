## Context

当前 tickets 表有 8 列（id, title, description, status, created_by, assigned_to, created_at, updated_at），支持基础的创建→指派→开始→完成流程。前端三个工作台已实现角色隔离和工单 CRUD，Drawer 组件展示工单详情。但工单缺少优先级和截止日期字段，Dispatcher 指派时 assignee 硬编码为 'completer'，无法选择真实用户。工单列表无排序逻辑。

## Goals / Non-Goals

**Goals:**

- tickets 表新增 priority（low/medium/high）和 due_date（ISO 日期，nullable）列
- POST /api/tickets 接受 priority 和 dueDate，带服务端校验
- PATCH /api/tickets/:id/assign 校验 assignedTo 为已存在用户
- Dispatcher 工作台按 priority 降序排列待指派工单
- assignee 从硬编码改为 users API 下拉选择（仅 completer 角色）
- Drawer 展示 priority tag 和 dueDate（临近到期红色警告）
- TDD：先写校验测试和 UI 测试，再写实现

**Non-Goals:**

- 不改状态机流转规则（submitted→assigned→in_progress→completed 保持不变）
- 不做服务端排序（API 返回全量，前端按 priority 排序）
- 不做 dueDate 过期后自动处理（仅视觉警告）
- 不做 priority 权重自定义（硬编码 low < medium < high）
- 不做批量操作

## Decisions

### D1: Priority 类型设计

**选择**：字符串枚举 `'low' | 'medium' | 'high'`，在 `packages/shared` 中定义 `Priority` 类型和 `PRIORITIES` 常量，与 `TicketStatus`、`Role` 风格一致。新增 `PRIORITY_ORDER` 映射表（`{ low: 0, medium: 1, high: 2 }`）供前端排序使用。

新增 `PRIORITY_LABELS` 映射（`{ low: '低', medium: '中', high: '高' }`）供前端 Tag/Select 显示中文标签。

理由：字符串枚举可读性好，DB 存储直观，与现有类型风格统一。数字权重集中管理，排序逻辑清晰。

### D2: dueDate 存储格式

**选择**：DB 列 `due_date`（text, nullable），存 ISO 日期字符串 `YYYY-MM-DD`。JS 属性名 `dueDate`。不存时间部分——工单截止粒度是天，不是时刻。

理由：日期粒度对工单系统足够，避免时区问题。nullable 因为不是所有工单都有截止日期。

### D3: assignee 校验策略

**选择**：PATCH /api/tickets/:id/assign 的 `assignedTo` 字段必须为 users 表中已存在的 username。路由处理函数通过 Drizzle `db.select().from(users).where(eq(users.username, assignedTo))` 查询，无结果返回 400 `{ error: '指派目标用户不存在' }`。

理由：防止指派给不存在的人，数据完整性保障。用 400 而非 404 因为是输入校验问题，不是资源不存在。

替代方案：不做校验（当前行为）——风险是 assignedTo 存无效值。

### D4: 排序实现位置

**选择**：前端客户端排序，API 不改（仍返回全量）。

Dispatcher 工作台拿到 tickets 后，用 `PRIORITY_ORDER` 映射排序：`tickets.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority])`。

理由：当前数据量极小（个位数），客户端排序简单直接。不需要改 API 接口，不引入分页/排序参数。

### D5: assignee 下拉数据来源与受控 Select

**选择**：Dispatcher 工作台组件挂载时调用 `GET /api/auth/users`（已存在），过滤 `role === 'completer'` 的用户作为 Select 选项。

数据来源：`GET /api/auth/users` 返回全部用户。
过滤条件：`user.role === 'completer'`。
过滤在客户端执行。

当前 `handleAssign(id)` 硬编码 `'completer'`，Select 也不受控。改为每行工单独立的受控 Select（`value` 由 `assignedToMap[record.id]` 状态管理，`onChange` 更新状态），`handleAssign` 从状态中读取选中值传入 `assignTicket(id, selectedValue)`。

理由：已有 users API，无需新增端点。过滤 completer 保证只有处理者可以被指派。受控 Select 确保指派值与用户选择一致。

### D6: Drawer 增强内容

**选择**：在现有 Drawer 中新增 priority Tag（颜色区分：high=red, medium=orange, low=blue）和 dueDate 显示（临近到期 = 今天或过去，显示红色文字 + "已到期"/"今日到期" 标签）。

理由：Drawer 已存在于三个工作台，只需增加字段展示。颜色区分符合 antd Tag 惯例。

### D7: 迁移策略

**选择**：两个迁移 SQL 文件（每文件一条 DDL，符合项目约定）放在 `apps/server/drizzle/`（Drizzle 配置的输出目录）：
- `0003_add_priority.sql`：`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';`
- `0004_add_due_date.sql`：`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS due_date TEXT;`

priority 设 DEFAULT 'medium' + NOT NULL，确保旧数据有合理默认值。due_date nullable，旧数据为 null。

**必须同步更新 `apps/server/drizzle/meta/_journal.json`**：新增 idx 3 和 idx 4 的 entry，tag 分别为 `0003_add_priority` 和 `0004_add_due_date`，否则 `migrate()` 不会执行新文件。

服务器入口已有自动 migrate 逻辑，无需额外处理。

### D8: 配置管理

无新增配置项。使用现有 dev proxy（Vite → Hono :3000）、现有端口、现有 .env。无需修改 .env.example。

## Directory Layout

```
packages/shared/src/
  index.ts                    ← 修改：导出 Priority 类型和常量
  ticket-types.ts             ← 修改：Ticket interface 新增 priority/dueDate 字段

apps/server/
  drizzle/
    0003_add_priority.sql     ← 新增
    0004_add_due_date.sql     ← 新增
    meta/_journal.json        ← 修改：新增 idx 3 和 4 的 entry
  src/
    db/
      schema.ts               ← 修改：tickets 表新增 priority、due_date 列
      seed.ts                 ← 修改：补充 priority/dueDate
    routes/
      tickets.ts              ← 修改：POST 接受新字段+校验，assign 校验用户存在性
    __tests__/
      tickets.test.ts         ← 修改：新增字段校验测试、assignee 存在性测试
      integration.test.ts     ← 修改：验证新字段在全流程中的流转

apps/web/src/
  api/
    client.ts                 ← 修改：createTicket 参数签名
  pages/
    SubmitterWorkbench.tsx    ← 修改：表单新增 priority Select + dueDate DatePicker + 表格 priority 列
    DispatcherWorkbench.tsx   ← 修改：排序 + 受控 assignee 下拉 + 表格新列
    CompleterWorkbench.tsx    ← 修改：表格新增 priority 列
  __tests__/
    workbench.test.tsx        ← 修改：新字段表单、排序、下拉测试

scripts/
  e2e-smoke.mjs               ← 修改：create ticket 传入 priority
```

## Risks / Trade-offs

- **[priority NOT NULL + DEFAULT]** → 旧数据自动填充 'medium'。如果将来想改默认值，需要新迁移。MVP 可接受。
- **[客户端排序]** → 数据量大时性能差。MVP 数据量个位数，不是问题。将来可改为服务端排序+分页。
- **[dueDate 仅视觉警告]** → 不阻止对已过期工单的操作。这是有意的——截止日期是提示性的，不是强制的。
- **[assignee 下拉仅 completer]** → 如果将来有多个角色可以处理工单，需要改过滤条件。但 MVP 只有 completer 可以 start/complete，过滤合理。

## Open Questions

1. priority 是否应该在 assign 之后才可改（比如 dispatcher 指派时可以调整优先级）？当前设计只在创建时设置，后续不可改。如果需要可改，要新增 PATCH endpoint。
2. dueDate 临近到期的"临近"阈值如何定义？当前设计用"今天或过去"作为到期判断。是否需要提前 N 天黄色警告？
