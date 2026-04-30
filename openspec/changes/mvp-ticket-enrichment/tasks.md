## 1. 共享类型定义

> 依赖：无。所有后续任务依赖此组完成。

- [x] 1.1 在 `packages/shared/src/ticket-types.ts` 中新增 `Priority` 类型（`'low' | 'medium' | 'high'`）、`PRIORITIES` 常量对象、`PRIORITY_ORDER` 映射表、`PRIORITY_LABELS` 映射（`{ low: '低', medium: '中', high: '高' }`）。在 `Ticket` interface 中新增 `priority: Priority` 和 `dueDate: string | null` 字段。从 `index.ts` 导出新类型 [TKT-008, TKT-009]
- [x] 1.2 写 `packages/shared/src/__tests__/ticket-types.test.ts`：验证 PRIORITIES 包含且仅包含 low/medium/high，PRIORITY_ORDER 中 high > medium > low，PRIORITY_LABELS 返回正确的中文标签 [TKT-008]
- [x] 1.3 验证：`pnpm -r run build` 编译通过（server 和 web 的 import 无报错）

## 2. 数据库 Schema + 迁移

> 依赖：1

- [x] 2.1 在 `apps/server/src/db/schema.ts` 的 tickets 表新增 `priority` 列（text, not null, default `'medium'`）和 `due_date` 列（text, nullable，映射到 JS `dueDate`） [TKT-010]
- [x] 2.2 创建 `apps/server/drizzle/0003_add_priority.sql`：`ALTER TABLE tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';`（每文件一条 DDL） [TKT-010]
- [x] 2.3 创建 `apps/server/drizzle/0004_add_due_date.sql`：`ALTER TABLE tickets ADD COLUMN due_date TEXT;`（每文件一条 DDL） [TKT-010]
- [x] 2.4 更新 `apps/server/drizzle/meta/_journal.json`：新增 idx 3（tag `0003_add_priority`）和 idx 4（tag `0004_add_due_date`）的 entry [TKT-010]
- [x] 2.5 验证：启动服务器（或运行 migrate），迁移成功执行，旧数据 priority 为 'medium'、due_date 为 null [TKT-010]

## 3. API — POST 创建工单校验（TDD）

> 依赖：2

- [x] 3.1 在 `apps/server/src/__tests__/tickets.test.ts` 新增测试用例（Red）：带 priority/dueDate 创建成功（201）、不传新字段使用默认值（priority='medium', dueDate=null）、无效 priority 返回 400、无效 dueDate 返回 400 [TKT-011]
- [x] 3.2 运行测试确认新增用例失败（Red）——POST handler 尚未处理新字段校验
- [x] 3.3 修改 `apps/server/src/routes/tickets.ts` 的 POST handler：从 body 提取 priority（缺省 'medium'）和 dueDate（缺省 null），校验 priority 是否在 PRIORITIES 值中、dueDate 是否可解析为有效日期，校验失败返回 400 `{ error: string }`，校验通过写入 DB [TKT-011]
- [x] 3.4 运行测试确认全部通过（Green）——含新增校验测试和原有测试

## 4. API — Assign 指派校验（TDD）

> 依赖：2

- [x] 4.1 在 `apps/server/src/__tests__/tickets.test.ts` 新增测试用例（Red）：指派给不存在用户返回 400 `{ error: '指派目标用户不存在' }` [TKT-012]
- [x] 4.2 运行测试确认新增用例失败（Red）
- [x] 4.3 修改 `apps/server/src/routes/tickets.ts` 的 PATCH assign handler：通过 Drizzle 查询 users 表验证 assignedTo 对应的 username 存在，不存在时返回 400 `{ error: '指派目标用户不存在' }` [TKT-012]
- [x] 4.4 运行测试确认全部通过（Green）

## 5. Seed 数据补充

> 依赖：2

- [x] 5.1 修改 `apps/server/src/db/seed.ts`：为 5 条 seed tickets 补充 priority（分别覆盖 high/medium/low）和 dueDate（部分有值、部分 null），使演示数据更真实

## 6. 前端 — Submitter 工作台

> 依赖：3

- [x] 6.1 修改 `apps/web/src/api/client.ts`：`createTicket` 函数参数新增可选 `priority?: Priority` 和 `dueDate?: string`
- [x] 6.2 修改 `apps/web/src/pages/SubmitterWorkbench.tsx`：创建工单表单新增 Priority antd Select（low/medium/high，默认 medium）和 dueDate antd DatePicker [TKT-011]
- [x] 6.3 SubmitterWorkbench 工单表格新增 priority 列（antd Tag，颜色区分） [TKT-016]
- [x] 6.4 修改 `apps/web/src/__tests__/workbench.test.tsx`：验证 Submitter 表单渲染了 priority Select 和 dueDate DatePicker，提交时将新字段传入 createTicket；验证表格显示 priority 列

## 7. 前端 — Dispatcher 工作台增强

> 依赖：3

- [x] 7.1 修改 `apps/web/src/pages/DispatcherWorkbench.tsx`：组件挂载时调用 `getUsers()`，过滤 `role === 'completer'` 的用户。将硬编码的 Select 替换为动态用户列表，改为受控 Select（每个工单独立状态），`handleAssign` 从状态读取选中值而非硬编码。数据来源：`getUsers()`，过滤条件：`role === 'completer'`，过滤在客户端执行 [TKT-014]
- [x] 7.2 Dispatcher 工作台待指派工单按 priority 降序排列（使用 PRIORITY_ORDER 映射，high→medium→low，稳定排序） [TKT-013]
- [x] 7.3 Dispatcher 工作台工单表格新增 priority 列（antd Tag 颜色区分：high=red, medium=orange, low=blue） [TKT-016]
- [x] 7.4 修改 `apps/web/src/__tests__/workbench.test.tsx`：验证高优先级工单排在前面、下拉框仅显示 completer 用户

## 8. 前端 — Drawer 增强 + Completer 工作台

> 依赖：3

- [x] 8.1 三个工作台的 Drawer 新增 priority Tag 展示（颜色区分：high=red, medium=orange, low=blue，文本使用 PRIORITY_LABELS）和 dueDate 日期展示 [TKT-015]
- [x] 8.2 Drawer dueDate 临近到期警告：dueDate 为当天显示红色 + "今日到期"，为过去日期显示红色 + "已到期" [TKT-015]
- [x] 8.3 CompleterWorkbench 工单表格新增 priority 列（antd Tag） [TKT-016]

## 9. 集成测试 + E2E + 全量验证

> 依赖：6, 7, 8

- [x] 9.1 修改 `apps/server/src/__tests__/integration.test.ts`：在全生命周期测试中验证新字段流转（创建时 priority/dueDate 正确返回，后续 assign/start/complete 不丢失字段）
- [x] 9.2 修改 `scripts/e2e-smoke.mjs`：create ticket 步骤传入 `priority: 'high'`，验证响应包含 priority 和 dueDate 字段
- [x] 9.3 验证：`pnpm check` 全绿（build + test + lint）
- [x] 9.4 验证：`node scripts/e2e-smoke.mjs` 全绿
