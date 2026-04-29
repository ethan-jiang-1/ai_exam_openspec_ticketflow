## MODIFIED Requirements

### Requirement: BE-001 Hono API 服务器

`apps/server` SHALL 是一个基于 Hono 框架的 API 服务器，支持 TypeScript。应用定义（`app.ts`）SHALL 是运行时无关的——不直接 import 任何运行时特定的数据库驱动或文件系统模块。

系统 SHALL 支持双入口：
- `index.ts`：Node.js 入口，使用 `@hono/node-server`，默认监听 `localhost:3000`（可通过 SERVER_HOST 和 SERVER_PORT 环境变量配置）
- `worker.ts`：Cloudflare Workers 入口，export Hono app 为 default export

两个入口 SHALL 将数据库实例通过 Hono 中间件注入 context，路由层通过 `c.get('db')` 获取。

#### Scenario: 启动 API 服务器（Node.js）

- **WHEN** 在根目录执行 `pnpm dev`
- **THEN** Hono 服务器 SHALL 启动在端口 3000，使用 `tsx watch` 实现热重载，控制台输出监听端口信息

#### Scenario: 启动时端口被占用

- **WHEN** 端口 3000 已被其他进程占用
- **THEN** 服务器 SHALL 打印明确的错误信息（包含端口号）并以非零退出码退出

#### Scenario: 健康检查端点

- **WHEN** 向 `GET /health` 发送请求
- **THEN** 服务器 SHALL 返回 `{ "status": "ok" }` 和 200 状态码，Content-Type 为 `application/json`

#### Scenario: Workers 入口导出 Hono app

- **WHEN** Wrangler 加载 `worker.ts`
- **THEN** 模块 SHALL export default Hono app 实例，从 `c.env.DB` 获取 D1 binding，创建 Drizzle 实例并通过中间件注入 context

#### Scenario: 路由层通过 context 获取 DB

- **WHEN** 路由处理函数需要访问数据库
- **THEN** SHALL 通过 `c.get('db')` 从 Hono context 获取数据库实例，不直接 import 任何 db 模块

### Requirement: BE-003 Drizzle ORM + SQLite 数据库

`apps/server` SHALL 集成 Drizzle ORM，支持双数据库后端：
- **Node.js 环境**：better-sqlite3 驱动，数据库文件路径由 `DATABASE_PATH` 环境变量指定，默认为 `./data/ticketflow.db`
- **Workers 环境**：Cloudflare D1 驱动，通过 `c.env.DB` binding 获取

两种后端 SHALL 使用相同的 `schema.ts` 定义，路由层通过 `c.get('db')` 获取的实例 SHALL 提供一致的 Drizzle 查询 API。

Node.js 环境初始化时 SHALL 启用 SQLite WAL 模式。

#### Scenario: 数据库连接初始化（Node.js）

- **WHEN** 服务器通过 `index.ts` 启动
- **THEN** Drizzle SHALL 成功连接到 `DATABASE_PATH` 指定的 SQLite 数据库文件（路径相对于项目根目录解析），启用 WAL 模式（`PRAGMA journal_mode=WAL`）。若文件不存在，SHALL 自动创建；若所在目录不存在，SHALL 自动创建目录

#### Scenario: 数据库连接初始化（Workers）

- **WHEN** Workers 运行时加载 `worker.ts`
- **THEN** SHALL 从 `c.env.DB` 获取 D1 binding，创建 Drizzle D1 实例并注入 Hono context

#### Scenario: 数据库迁移（本地）

- **WHEN** 在 `apps/server` 目录执行 `pnpm db:migrate`
- **THEN** Drizzle Kit SHALL 读取 `drizzle.config.ts` 并将 schema 变更应用到本地 SQLite 数据库

#### Scenario: 数据库迁移（D1）

- **WHEN** 执行 `wrangler d1 migrations apply ticketflow-db --remote`
- **THEN** Wrangler SHALL 读取 `apps/server/drizzle/` 目录下的 SQL 迁移文件，应用到远程 D1 数据库，在 `d1_migrations` 表中记录已应用的版本

#### Scenario: 数据库文件被 gitignore

- **WHEN** SQLite 数据库文件被创建在项目目录中
- **THEN** `*.db`、`*.db-journal`、`*.db-wal` 文件 SHALL 被 `.gitignore` 忽略，不进入版本控制

## ADDED Requirements

### Requirement: BE-006 DB 工厂模式

`apps/server/src/db/` 目录 SHALL 包含运行时特定的数据库工厂函数：
- `node.ts`：导出 `createDb(dbPath: string)` 函数，创建 better-sqlite3 + Drizzle 实例
- `d1.ts`：导出 `createDb(d1Binding: D1Database)` 函数，创建 D1 + Drizzle 实例

`db/index.ts` SHALL 被移除（或改为仅 re-export node 工厂供向后兼容）。路由层 SHALL NOT 直接 import `db/index.ts`。

#### Scenario: Node.js 工厂函数

- **WHEN** 调用 `createDb(dbPath)` from `db/node.ts`
- **THEN** SHALL 返回启用了 WAL 模式的 better-sqlite3 Drizzle 实例，目录不存在时自动创建

#### Scenario: D1 工厂函数

- **WHEN** 调用 `createDb(d1Binding)` from `db/d1.ts`
- **THEN** SHALL 返回 Drizzle D1 实例，使用传入的 D1 binding

### Requirement: BE-007 种子数据

`apps/server` SHALL 提供种子数据用于初始化演示数据：
- `src/db/seed.ts`：使用 Drizzle ORM insert API 插入种子数据，供 `pnpm db:seed` 本地使用
- `seed.sql`：等价 INSERT 语句，供 `wrangler d1 execute` 云端播种

两份数据 SHALL 覆盖全部 4 种状态（submitted / assigned / in_progress / completed）。

#### Scenario: 本地播种

- **WHEN** 在 `apps/server` 目录执行 `pnpm db:seed`
- **THEN** 脚本 SHALL 使用 Drizzle ORM insert API 向本地 SQLite 插入至少 4 条 ticket，覆盖 submitted、assigned、in_progress、completed 四种 status 值

#### Scenario: 云端播种

- **WHEN** 执行 `wrangler d1 execute ticketflow-db --remote --file=apps/server/seed.sql`
- **THEN** D1 数据库 SHALL 包含种子数据，`GET /api/tickets` 返回至少 4 条记录
