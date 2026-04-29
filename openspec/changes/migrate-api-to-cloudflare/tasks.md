## 1. 依赖声明 [DT-007]

- [ ] 1.1 在 `apps/server/package.json` 的 devDependencies 中添加 `@cloudflare/workers-types`，用于 `worker.ts` 中 `D1Database` 等 Workers 类型 — [DT-007]

## 2. DB 工厂函数 [BE-006]

- [ ] 2.1 新增 `apps/server/src/db/types.ts`：定义 Drizzle 实例联合类型（`BetterSQLite3Database | DrizzleD1Database`）作为 Hono Variables 的 `db` 字段类型；定义 Workers Bindings 类型（`{ DB: D1Database }`）供 worker.ts 使用；定义 Node.js 环境类型（仅 Variables，无 Bindings）供 index.ts 使用 — [BE-006]
- [ ] 2.2 新增 `apps/server/src/db/node.ts`：导出 `createDb(dbPath: string)` 工厂函数，封装 better-sqlite3 初始化（创建目录、WAL 模式），返回 Drizzle 实例。`dbPath` 为 `:memory:` 时跳过 path.resolve 和目录创建 — [BE-006]
- [ ] 2.3 新增 `apps/server/src/db/d1.ts`：导出 `createDb(d1Binding: D1Database)` 工厂函数，返回 Drizzle D1 实例 — [BE-006]

## 3. App 重构为工厂模式 [BE-001]

- [ ] 3.1 修改 `apps/server/src/app.ts`：移除 `import './db'`，改为导出 `createApp(dbMiddleware)` 泛型工厂函数，Hono Variables 类型引用 `db/types.ts`，保留 logger/cors/routes/onError — [BE-001]
- [ ] 3.2 修改 `apps/server/src/routes/tickets.ts`：`import { db } from '../db'` → `c.get('db')` 获取 Drizzle 实例，所有 6 个端点统一改用 context 注入 — [BE-001]

## 4. 入口文件 [BE-001]

- [ ] 4.1 修改 `apps/server/src/index.ts`：导入 `createDb` from `db/node.ts`，调用 `createApp()` 传入 better-sqlite3 db 中间件，保留 `@hono/node-server` serve 逻辑 — [BE-001]
- [ ] 4.2 新增 `apps/server/src/worker.ts`：Workers 入口，使用 `db/types.ts` 的 Workers Bindings 类型，从 `c.env.DB` 获取 D1 binding，调用 `createApp()` 传入 D1 db 中间件，export default app — [BE-001]

## 5. 更新测试 [BE-001, BE-003]

- [ ] 5.1 新增 `apps/server/src/__tests__/helpers.ts`：导出 `createTestApp()` 工厂函数，调用 `createDb(':memory:')` 创建内存 better-sqlite3 实例 + 注入 db 中间件的 Hono app，同时导出 db 实例供测试清空数据使用 — [BE-001]
- [ ] 5.2 修改 `apps/server/src/__tests__/tickets.test.ts`：`import app` → 使用 `createTestApp()`，`import { db }` → 从 helper 获取 db 用于 beforeEach 清空数据 — [BE-003]
- [ ] 5.3 修改 `apps/server/src/__tests__/integration.test.ts`：同 5.2 模式，使用 `createTestApp()` — [BE-003]
- [ ] 5.4 修改 `apps/server/src/__tests__/db.test.ts`：改为测试 `db/node.ts` 工厂函数（WAL 模式、返回 Drizzle 实例、`:memory:` 支持）— [BE-003]
- [ ] 5.5 修改 `apps/server/src/__tests__/health.test.ts`：使用 `createTestApp()` 替代直接 import app — [BE-001]
- [ ] 5.6 修改 `apps/server/src/__tests__/cors.test.ts`：使用 `createTestApp()` 替代直接 import app — [BE-001]

## 6. 清理旧 DB 模块 [BE-006]

- [ ] 6.1 删除 `apps/server/src/db/index.ts`（所有引用方已在 3-5 中迁移完毕）— [BE-006]

## 7. Wrangler 配置 [DT-007]

- [ ] 7.1 修改 `wrangler.jsonc`：添加 `main: "./apps/server/src/worker.ts"`、`d1_databases` 绑定（binding: "DB", database_name: "ticketflow-db", migrations_dir: "apps/server/drizzle"）、保留现有 assets 配置 — [DT-007]

## 8. 种子数据 [BE-007]

- [ ] 8.1 新增 `apps/server/src/db/seed.ts`：使用 Drizzle ORM API 插入 5 条演示 ticket，覆盖全部 4 种 status（submitted ×2, assigned, in_progress, completed），使用固定 UUID 和合法字段值。使用 `drizzle-orm/better-sqlite3` 的 insert API，符合"禁止原始 SQL"约定 — [BE-007]
- [ ] 8.2 新增 `apps/server/seed.sql`：与 seed.ts 数据等价的 INSERT 语句，供 `wrangler d1 execute` 云端播种 — [BE-007]
- [ ] 8.3 在 `apps/server/package.json` 的 scripts 中添加 `db:seed` 命令（`tsx src/db/seed.ts`）— [BE-007]

## 9. D1 迁移准备 [BE-003]

- [ ] 9.1 执行 `drizzle-kit generate` 生成 SQL 迁移文件到 `apps/server/drizzle/` 目录（如已有则确认可用）— [BE-003]
- [ ] 9.2 执行 `npx wrangler d1 create ticketflow-db` 创建 D1 数据库，将返回的 `database_id` 写入 `wrangler.jsonc` — [BE-003]
- [ ] 9.3 执行 `wrangler d1 migrations apply ticketflow-db --remote` 应用迁移到远程 D1 — [BE-003]

## 10. 验证

- [ ] 10.1 执行 `pnpm check`（build + test + lint）确认全绿，验证 Scenario: 本地构建不受影响 — [BE-001, BE-003]
- [ ] 10.2 执行本地 `pnpm dev` 前后端联调，确认 API 调用正常 — [BE-001]
- [ ] 10.3 执行 `wrangler deploy` 部署前后端一体化 Worker，验证 API 端点返回 JSON（非 HTML）— [DT-007]
- [ ] 10.4 执行 `wrangler d1 execute ticketflow-db --remote --file=apps/server/seed.sql` 云端播种，验证 `GET /api/tickets` 返回种子数据 — [BE-007]
