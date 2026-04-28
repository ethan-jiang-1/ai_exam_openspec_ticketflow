## 1. 数据库 Schema 与迁移

- [ ] 1.1 在 `apps/server/src/db/schema.ts` 中定义 `tickets` 表，列名 snake_case（`created_by`, `assigned_to`, `created_at`, `updated_at`），通过 Drizzle `text('column_name')` 映射到 camelCase JS 属性名 [TKT-001]
- [ ] 1.2 在 `apps/server/src/db/index.ts` 中创建 Drizzle instance（使用 `drizzle-orm/better-sqlite3` adapter）并导出 `db` [TKT-001]
- [ ] 1.3 运行 `pnpm db:migrate` 验证 tickets 表创建成功 [TKT-001 Scenario 3]

## 2. CRUD API（依赖 1.1, 1.2）

- [ ] 2.1 创建 `apps/server/src/routes/tickets.ts`，实现 `GET /api/tickets`（列出全部）和 `GET /api/tickets/:id`（按 ID 查询，不存在返回 404 + `{ error }` 格式） [TKT-003]
- [ ] 2.2 在同一文件中实现 `POST /api/tickets`（创建工单，title 和 createdBy 非空校验，`crypto.randomUUID()` 生成 id，自动填充 status/createdAt/updatedAt） [TKT-002]
- [ ] 2.3 在 `apps/server/src/app.ts` 中以 `/api/tickets` 前缀挂载 tickets 路由 [TKT-007]

## 3. 状态流转 API（依赖 2.3）

- [ ] 3.1 实现 `PATCH /api/tickets/:id/assign`（submitted → assigned，设置 assignedTo，更新 updatedAt；工单不存在返回 404，非法状态返回 400 + `{ error }`） [TKT-004]
- [ ] 3.2 实现 `PATCH /api/tickets/:id/start`（assigned → in_progress，更新 updatedAt；工单不存在返回 404，非法状态返回 400 + `{ error }`） [TKT-005]
- [ ] 3.3 实现 `PATCH /api/tickets/:id/complete`（in_progress → completed，更新 updatedAt；工单不存在返回 404，非法状态返回 400 + `{ error }`） [TKT-006]

## 4. 测试（依赖 3.1, 3.2, 3.3）

- [ ] 4.1 创建 `apps/server/src/__tests__/tickets.test.ts`，使用 `app.request()` + `beforeEach` 通过 Drizzle `db.delete(tickets)` 清空表（不写原始 SQL） [TKT-002] [TKT-003] [TKT-004] [TKT-005] [TKT-006]
  - 验证 `POST /api/tickets` 成功返回 201，id 为 UUID 格式，字段完整 [TKT-002 Scenario 1]
  - 验证 `POST /api/tickets` title 为空返回 400 [TKT-002 Scenario 2]
  - 验证 `POST /api/tickets` createdBy 为空返回 400 [TKT-002 Scenario 3]
  - 验证 `GET /api/tickets` 返回数组 [TKT-003 Scenario 1]
  - 验证 `GET /api/tickets/:id` 成功返回 200 [TKT-003 Scenario 2]
  - 验证 `GET /api/tickets/:id` 不存在返回 404 [TKT-003 Scenario 3]
  - 验证 assign 成功（status=assigned, assignedTo 有值, updatedAt 更新） [TKT-004 Scenario 1]
  - 验证 assign 非法状态返回 400 [TKT-004 Scenario 2]
  - 验证 assign 不存在返回 404 [TKT-004 Scenario 3]
  - 验证 start 成功 + 非法状态 400 + 不存在 404 [TKT-005 Scenario 1, 2, 3]
  - 验证 complete 成功 + 非法状态 400 + 不存在 404 [TKT-006 Scenario 1, 2, 3]

## 5. 验证（依赖 4.1）

- [ ] 5.1 运行 `pnpm check`（build + test + lint）确认全部通过 [TKT-001~007]
