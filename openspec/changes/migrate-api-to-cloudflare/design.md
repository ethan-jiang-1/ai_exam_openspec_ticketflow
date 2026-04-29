## Context

TicketFlow 前端已部署为 Cloudflare Workers 静态资产，但 API 请求在云端无后端处理——被 SPA fallback 返回 `index.html`，导致 JSON 解析错误。后端使用 Hono（Workers 原生框架）+ Drizzle ORM（有 D1 适配器），架构上已具备迁移条件。

当前后端栈：Hono + `@hono/node-server` + `better-sqlite3` + Drizzle ORM，运行在 Node.js 上。
目标后端栈：Hono + Cloudflare D1 + Drizzle ORM，运行在 Workers 上。

## Design Principle: 部署目标无关

核心原则：**业务逻辑与部署运行时解耦**。Cloudflare Workers 只是当前实验性部署目标之一，不是唯一目标。

实现方式：
- `app.ts` 是运行时无关的 Hono app 定义，不 import 任何运行时特定代码
- DB 实例通过 Hono context 传递（`c.get('db')`），路由层不感知底层是 better-sqlite3 还是 D1
- 每个部署目标对应一个入口文件（`index.ts` for Node.js, `worker.ts` for Workers），职责是创建 DB 实例并注入 app
- 未来新增部署目标（Vercel、Deno Deploy 等）只需新增入口文件和 DB 工厂，不改动路由层

## Goals / Non-Goals

**Goals:**
- 前后端一体化部署：`wrangler deploy` 同时部署 API 和静态资产
- API 端点路径和响应格式完全不变，前端代码零修改
- 本地开发体验不变（`pnpm dev` 走 Node.js + better-sqlite3）
- 现有测试继续通过（使用 better-sqlite3 本地测试）
- DB migration 策略覆盖本地和云端，drizzle-kit 统一管理 schema 演进
- 首次部署有 seeding 机制初始化演示数据

**Non-Goals:**
- 不迁移到 Cloudflare D1 的本地模拟（miniflare）——保留 better-sqlite3 本地开发
- 不部署后端到其他平台（但架构上保持可扩展）
- 不修改前端 API 调用逻辑
- 不实现 CI/CD 自动部署流水线（本次手动 `wrangler deploy`）

## Decisions

### D1: 单 Worker 架构（API + 静态资产）

一个 Worker 同时处理 API 路由和静态资产。Hono 路由匹配 `/api/*` 和 `/health`，未匹配请求 fall through 到静态资产。

**替代方案**: 两个独立 Worker（API Worker + Assets Worker）— 增加部署复杂度，需要配 CORS 和跨 Worker 路由。

### D2: 双入口 + 共享 app.ts

- `app.ts`：运行时无关的 Hono app 定义，路由通过 `c.get('db')` 获取数据库实例
- `index.ts`（Node.js 入口）：创建 better-sqlite3 db，通过中间件注入，启动 `@hono/node-server`
- `worker.ts`（Workers 入口）：从 `c.env.DB` 创建 D1 drizzle 实例，通过中间件注入，export default app

**替代方案**: 仅用 Workers 入口 + miniflare 本地模拟 — 强制依赖 Cloudflare 工具链，增加本地开发复杂度。

### D3: DB 工厂模式收敛在 db/ 目录

```
apps/server/src/db/
  schema.ts    — 不变
  node.ts      — better-sqlite3 工厂（Node.js 本地开发/测试）
  d1.ts        — D1 工厂（Workers 生产环境）
```

路由层不直接 import db 实例，改为从 Hono context 获取。符合项目"DB 代码收敛在 db/ 目录"的约定。

工厂函数签名统一：
```ts
// node.ts — 返回 BetterSQLite3Database
export function createDb(dbPath: string) { ... }

// d1.ts — 返回 DrizzleD1Database
export function createDb(d1Binding: D1Database) { ... }
```

两种 Drizzle 实例共享同一个 `schema.ts`，查询 API 一致。Hono 的 `c.get('db')` 类型需要设为两者的联合类型。

### D4: D1 数据库绑定

`wrangler.jsonc` 添加 D1 binding：
```jsonc
"d1_databases": [{ "binding": "DB", "database_name": "ticketflow-db", "database_id": "..." }]
```

Schema 通过 drizzle-kit 生成 SQL 迁移文件，`wrangler d1 migrations apply` 应用。

### D5: 测试策略不变

现有测试使用 better-sqlite3 创建独立 db 实例。迁移后，测试创建 test Hono app 并注入 better-sqlite3 db，路由代码通过 `c.get('db')` 获取。不需要 miniflare。

### D6: wrangler.jsonc main 字段指向 worker.ts

`main` 设为 `"./apps/server/src/worker.ts"`，Wrangler 内置 esbuild 处理 TypeScript 打包。需确保 esbuild 能解析 monorepo 的 workspace 依赖（`@ticketflow/shared`）。

### D7: D1 Migration 策略

**统一 schema 源，双通道应用：**

- `drizzle-kit generate` 从 `schema.ts` 生成 SQL 迁移文件到 `apps/server/drizzle/` 目录
- 本地开发：`drizzle-kit push`（或 `drizzle-kit migrate`）直接应用到 better-sqlite3 文件
- 云端生产：`wrangler d1 migrations apply ticketflow-db --remote` 应用同一份 SQL 文件

```
schema.ts ──drizzle-kit generate──▶ drizzle/0000_*.sql
                                       │
                        ┌──────────────┼──────────────┐
                        ▼                             ▼
              drizzle-kit push            wrangler d1 migrations apply
              (本地 better-sqlite3)         (云端 D1)
```

Wrangler D1 的迁移目录默认是 `migrations/`，通过 `migrations_dir` 配置指向 `apps/server/drizzle/`。D1 内部通过 `d1_migrations` 表追踪已应用的迁移版本。

### D8: Seeding 策略

**双文件方案：Drizzle ORM 本地播种 + SQL 云端播种。**

- `seed.ts`（`apps/server/src/db/seed.ts`）：使用 Drizzle ORM insert API 插入种子数据，供本地 `pnpm db:seed` 使用。遵循"禁止原始 SQL"编码约定。
- `seed.sql`（`apps/server/seed.sql`）：等价的 INSERT 语句，供 `wrangler d1 execute ticketflow-db --remote --file=seed.sql` 云端播种。属于部署工具文件（与 `drizzle/` 迁移 SQL 同类），不受应用代码 SQL 禁令约束。
- 两份数据内容一致，人工保持同步。

种子数据内容：5 条演示 ticket，覆盖全部 4 个状态（submitted / assigned / in_progress / completed），使用固定 UUID，方便 UI 验证。

## Directory Layout

```
apps/server/
  src/
    app.ts              — 修改：移除 import './db'，导出 createApp 工厂函数
    index.ts            — 修改：使用 db 工厂 + createApp
    worker.ts           — 新增：Workers 入口，D1 db 注入
    db/
      schema.ts         — 不变
      types.ts          — 新增：Drizzle 联合类型、Hono Variables/Bindings 类型定义
      node.ts           — 新增：better-sqlite3 工厂函数（支持 :memory:）
      d1.ts             — 新增：D1 工厂函数
      seed.ts           — 新增：本地播种脚本（Drizzle ORM）
    routes/
      tickets.ts        — 修改：db 从 c.get('db') 获取
      health.ts         — 不变（不使用 db）
  drizzle/              — 不变：drizzle-kit generate 输出目录
  seed.sql              — 新增：云端播种 SQL（部署工具文件）
  drizzle.config.ts     — 不变
wrangler.jsonc          — 修改：加 main + d1_databases + migrations_dir
```

## Configuration Management

| 配置项 | 本地开发 (Node.js) | 生产 (Workers) |
|--------|-------------------|----------------|
| 运行时入口 | `index.ts` | `worker.ts` |
| 数据库 | better-sqlite3 文件 | Cloudflare D1 |
| DB 路径 | `DATABASE_PATH` env var | D1 binding `DB` |
| 端口 | `SERVER_PORT` (default 3000) | Workers 自动 |
| CORS | Hono cors() middleware | 同左（静态资产同域，CORS 不触发）|
| Migration | `drizzle-kit push` | `wrangler d1 migrations apply` |
| Seeding | `pnpm db:seed`（seed.ts via Drizzle ORM） | `wrangler d1 execute --file=seed.sql` |

## Dev Proxy Strategy

生产环境不需要代理——前端和 API 在同一个 Worker 同一个域名下，`/api/*` 直接命中 Hono 路由。
本地开发保持现有 Vite proxy（`/api` → `localhost:3000`）不变。

## Risks / Trade-offs

- [D1 数据库需手动创建] → `npx wrangler d1 create ticketflow-db` 是一次性操作，database_id 需写入 wrangler.jsonc。无法完全自动化。
- [Wrangler esbuild 与 monorepo] → workspace 依赖 `@ticketflow/shared` 可能需要配置 esbuild alias 或 external。需测试验证。
- [双运行时维护成本] → node.ts 和 d1.ts 两个工厂函数，但逻辑简单（各约 10 行），路由层完全一致。
- [D1 冷启动延迟] → 首次请求可能有 ~100ms 延迟，后续请求正常。对内部工具可接受。
- [Migration 双通道] → 本地和云端分别用不同命令应用同一份 SQL，需在部署 checklist 中明确步骤。
- [@cloudflare/workers-types 与 @types/node 共存] → 两个包都声明全局类型（Request、Response 等），在同一 tsconfig 下可能冲突。需在 worker.ts 中使用 `/// <reference types="@cloudflare/workers-types" />` 三斜线指令局部引入，或在 tsconfig 中显式列出 types 数组。
- [node.ts :memory: 支持] → 测试使用内存数据库，`path.resolve(':memory:')` 会错误地生成文件路径。工厂函数需对 `:memory:` 跳过 path.resolve 和目录创建。

## Migration Plan

1. 添加 `@cloudflare/workers-types` 依赖
2. 新增 `db/types.ts`：类型定义
3. 新增 `db/node.ts`、`db/d1.ts`：工厂函数
4. 修改 `app.ts`：工厂模式 + 移除 `import './db'`
5. 修改 `routes/tickets.ts`：`import { db }` → `c.get('db')`
6. 修改 `index.ts`：使用新 db 工厂 + createApp
7. 新增 `worker.ts`：Workers 入口
8. 更新所有测试：创建 test app 实例 + helpers
9. 删除 `db/index.ts`
10. 修改 `wrangler.jsonc`：添加 `main`、`d1_databases`、`migrations_dir`
11. 创建 `seed.ts`（Drizzle ORM）+ `seed.sql`（云端）
12. 生成 D1 迁移文件 + 创建数据库 + 应用迁移
13. 部署验证

## Open Questions

1. ~~`@ticketflow/shared` workspace 依赖在 Wrangler esbuild 打包时能否正确解析？~~ → 已验证：server 仅 `import type { TicketStatus }` from shared，esbuild 会剥离 type-only import，不产生运行时依赖。`@ticketflow/shared` 的 `main` 指向 TS 源码（`src/index.ts`），即使需要解析也不需要预编译。**结论：无问题。**
2. D1 数据库 `database_id` 是否应写入 `wrangler.jsonc`（会进入 git），还是用 `wrangler.toml`（gitignore）+ 环境变量方案？
