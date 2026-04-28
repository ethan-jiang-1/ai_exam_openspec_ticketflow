## 1. 数据库 Schema 与迁移

- [ ] 1.1 在 `apps/server/src/db/schema.ts` 中定义 `tickets` 表（id/title/description/status/createdBy/assignedTo/createdAt/updatedAt），列名使用 snake_case，通过 Drizzle `text` 映射 camelCase 字段名 [TKT-001]
- [ ] 1.2 在 `apps/server/src/db/index.ts` 中创建 Drizzle instance 并导出 `db`（使用 `drizzle-orm/better-sqlite3` adapter） [TKT-001]
- [ ] 1.3 运行 `pnpm db:migrate` 验证 tickets 表创建成功 [TKT-001 Scenario 3]

## 2. CRUD API

- [ ] 2.1 创建 `apps/server/src/routes/tickets.ts`，实现 `GET /api/tickets`（列出全部）和 `GET /api/tickets/:id`（按 ID 查询，404 处理） [TKT-003]
- [ ] 2.2 在同一文件中实现 `POST /api/tickets`（创建工单，title 非空校验，自动填充 id/createdAt/updatedAt） [TKT-002]
- [ ] 2.3 在 `apps/server/src/app.ts` 中以 `/api/tickets` 前缀挂载 tickets 路由 [TKT-007]

## 3. 状态流转 API

- [ ] 3.1 实现 `PATCH /api/tickets/:id/assign`（submitted → assigned，前置状态校验） [TKT-004]
- [ ] 3.2 实现 `PATCH /api/tickets/:id/start`（assigned → in_progress，前置状态校验） [TKT-005]
- [ ] 3.3 实现 `PATCH /api/tickets/:id/complete`（in_progress → completed，前置状态校验） [TKT-006]

## 4. 测试

- [ ] 4.1 创建 `apps/server/src/__tests__/tickets.test.ts`，覆盖所有 API 端点：创建（含 title 空值校验）、列表、按 ID 查询（含 404）、assign（含非法状态）、start（含非法状态）、complete（含非法状态） [TKT-002] [TKT-003] [TKT-004] [TKT-005] [TKT-006]
  - 验证 `POST /api/tickets` 成功返回 201，字段完整 [TKT-002 Scenario 1, 2]
  - 验证 `GET /api/tickets` 返回数组 [TKT-003 Scenario 1]
  - 验证 `GET /api/tickets/:id` 成功返回 200，不存在返回 404 [TKT-003 Scenario 2, 3]
  - 验证 assign 成功和非法状态拒绝 [TKT-004 Scenario 1, 2]
  - 验证 start 成功和非法状态拒绝 [TKT-005 Scenario 1, 2]
  - 验证 complete 成功和非法状态拒绝 [TKT-006 Scenario 1, 2]

## 5. 验证

- [ ] 5.1 运行 `pnpm check`（build + test + lint）确认全部通过 [TKT-001~007]
