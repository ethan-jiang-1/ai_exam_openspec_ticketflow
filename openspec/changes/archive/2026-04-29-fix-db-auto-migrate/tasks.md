## 1. 迁移 SQL 幂等化 [BE-003]

- [x] 1.1 修改 `apps/server/drizzle/0000_rainy_doctor_doom.sql`：`CREATE TABLE` → `CREATE TABLE IF NOT EXISTS` — [BE-003 Scenario: 迁移 SQL 幂等执行]

## 2. Node.js 入口 auto-migrate [BE-001]

- [x] 2.1 修改 `apps/server/src/index.ts`：添加 `import { migrate } from 'drizzle-orm/better-sqlite3/migrator'`，在 `createDb()` 后调用 `migrate(db, { migrationsFolder: './drizzle' })` — [BE-001 Scenario: Node.js 入口自动迁移数据库]

## 3. 本地验证 [BE-001, BE-003]（依赖 1.1 和 2.1 完成）

- [x] 3.1 场景 A：删除本地 DB 文件，`pnpm dev` 启动，确认 `/api/tickets` 返回空数组 — [BE-001 Scenario: Node.js 入口自动迁移数据库]
- [x] 3.2 场景 B：先 `pnpm db:migrate`（push 创建表），再 `pnpm dev`，确认不 crash — [BE-001 Scenario: Node.js 入口对已有数据库幂等]
- [x] 3.3 场景 C：多次重启 `pnpm dev`，确认每次正常 — [BE-001 Scenario: Node.js 入口对已有数据库幂等]
- [x] 3.4 场景 D：`pnpm db:seed` 播种数据，确认 `/api/tickets` 返回 5 条记录 — [BE-007]
- [x] 3.5 `pnpm check` 确认 build + test + lint 全绿 — [BE-001]

## 4. config.yaml 补充约束 [BE-001, BE-003]

- [x] 4.1 在 `openspec/config.yaml` 编码约定中新增：服务器入口 SHALL 启动时自动应用数据库迁移；迁移 SQL 文件 SHALL 使用 IF NOT EXISTS 确保幂等性 — [BE-001, BE-003]
