## Why

前端（change ③）需要一个可工作的 REST API 来驱动 Demo 流程。本 change 在已有共享类型（①）的基础上，落地数据库表、迁移和完整的 CRUD + 状态流转 API。

## What Changes

- 在 `apps/server/src/db/schema.ts` 中定义 `tickets` 表的 Drizzle schema
- 使用 `drizzle-kit push` 完成首次迁移
- 在 `apps/server/src/routes/` 新增 `tickets.ts` 路由，提供 REST API
- API 覆盖：CRUD（list / get / create）+ 状态流转（assign / start / complete）
- 新增路由挂载到 `app.ts`

## Capabilities

### New Capabilities

- `ticket`: 工单数据模型与 REST API — 涵盖 tickets 表定义、迁移、CRUD 操作和状态流转端点

### Modified Capabilities

（无）

## Impact

- `apps/server/src/db/schema.ts` — 替换空 schema，新增 tickets 表定义
- `apps/server/src/routes/tickets.ts` — 新增
- `apps/server/src/app.ts` — 新增 tickets 路由挂载
- `apps/server/src/__tests__/` — 新增 API 测试文件
- `apps/server/package.json` — 无新依赖（drizzle-orm / better-sqlite3 已存在）
- `.env.example` — 无变更（DATABASE_PATH 已存在）

## Success Criteria

- `pnpm db:migrate` 成功创建 tickets 表
- `curl` 可跑通完整状态流转：create → list → assign → start → complete
- `pnpm check`（build + test + lint）全部通过
