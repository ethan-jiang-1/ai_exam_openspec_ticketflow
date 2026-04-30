## Why

工单目前只有 title、description、status、createdBy、assignedTo 这些基础字段。Dispatcher 指派时 assignee 硬编码为 'completer'，无法从真实用户中选择。工单列表无排序逻辑，无法按紧急程度处理。MVP 验收要求 priority/dueDate/assignee 等关键字段进入主线判断，且至少一组关键状态推进有明确规则——当前这些字段和规则都不存在。

## What Changes

- tickets 表新增 `priority`（low / medium / high）和 `due_date`（ISO 日期字符串，nullable）列
- shared Ticket 类型新增 `priority` 和 `dueDate` 字段，新增 `Priority` 类型
- POST /api/tickets 接受 `priority` 和 `dueDate` 参数，带服务端校验（priority 必须为合法枚举值，dueDate 必须为有效日期格式）
- PATCH /api/tickets/:id/assign 校验 `assignedTo` 必须为已存在的用户
- Dispatcher 工作台待指派工单按 priority 降序排列
- assignee 从硬编码 'completer' 改为从 users API 下拉选择
- 工单详情 Drawer 展示 priority tag（颜色区分）和 dueDate（临近到期视觉警告）
- seed 数据补充 priority/dueDate，让演示更真实

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `ticket`: 新增 priority/dueDate 字段定义与校验规则、assignee 真实用户校验、优先级排序行为

## Impact

- `packages/shared/src/` — Ticket 类型新增 priority/dueDate，新增 Priority 类型和常量
- `apps/server/src/db/schema.ts` — tickets 表新增 priority、due_date 列
- `apps/server/drizzle/` — 新增迁移 SQL（每文件一条 DDL，IF NOT EXISTS 幂等）+ 更新 `_journal.json`
- `apps/server/src/routes/tickets.ts` — POST 接受新字段并校验，assign 校验 assignedTo 存在性
- `apps/server/src/db/seed.ts` — 补充 priority/dueDate
- `apps/web/src/pages/` — 三个工作台 UI 增强（表单新字段、表格新列、Drawer 增强、排序）
- `apps/web/src/api/client.ts` — createTicket 调用签名更新
- 测试文件 — 新增字段校验测试、assignee 存在性测试、前端组件测试

## Success Criteria

- POST /api/tickets 传入无效 priority（如 "urgent"）返回 400
- POST /api/tickets 传入无效 dueDate（如 "not-a-date"）返回 400
- PATCH /api/tickets/:id/assign 传入不存在的用户名返回 400
- Dispatcher 工作台待指派工单按 high → medium → low 排列
- Submitter/Dispatcher/Completer 工作台表格均显示 priority 列
- assignee 下拉框列出 users API 返回的 completer 用户，且 handleAssign 读取选中值
- Drawer 显示 priority tag（颜色区分）和 dueDate
- `pnpm check` 全绿（build + test + lint）
- `node scripts/e2e-smoke.mjs` 全绿
