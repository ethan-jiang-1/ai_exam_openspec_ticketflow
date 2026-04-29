## MODIFIED Requirements

### Requirement: BE-001 Hono API 服务器

`apps/server` SHALL 是一个基于 Hono 框架的 API 服务器，支持 TypeScript。应用定义（`app.ts`）SHALL 是运行时无关的——不直接 import 任何运行时特定的数据库驱动或文件系统模块。

系统 SHALL 支持双入口：
- `index.ts`：Node.js 入口，使用 `@hono/node-server`，默认监听 `localhost:3000`（可通过 SERVER_HOST 和 SERVER_PORT 环境变量配置）
- `worker.ts`：Cloudflare Workers 入口，export Hono app 为 default export

两个入口 SHALL 将数据库实例通过 Hono 中间件注入 context，路由层通过 `c.get('db')` 获取。

Node.js 入口 SHALL 在启动时自动应用数据库迁移（调用 `migrate(db, { migrationsFolder: './drizzle' })`），确保新环境开箱即用。迁移 SHALL 是幂等的（已迁移的 DB 重启不报错）。

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

#### Scenario: Node.js 入口自动迁移数据库

- **WHEN** Node.js 服务器启动且数据库文件不存在或为空
- **THEN** SHALL 自动应用 `./drizzle` 目录下的迁移文件，创建表结构，后续 API 调用不报 "table not found" 错误

#### Scenario: Node.js 入口对已有数据库幂等

- **WHEN** Node.js 服务器启动且数据库已有表（由 `drizzle-kit push` 或之前的 `migrate()` 创建）
- **THEN** 服务器 SHALL 正常启动不报错，迁移 SQL 使用 `IF NOT EXISTS` 确保幂等

### Requirement: BE-003 Drizzle ORM + SQLite 数据库

`apps/server` SHALL 集成 Drizzle ORM，支持双数据库后端：
- **Node.js 环境**：better-sqlite3 驱动，数据库文件路径由 `DATABASE_PATH` 环境变量指定，默认为 `./data/ticketflow.db`
- **Workers 环境**：Cloudflare D1 驱动，通过 `c.env.DB` binding 获取

两种后端 SHALL 使用相同的 `schema.ts` 定义，路由层通过 `c.get('db')` 获取的实例 SHALL 提供一致的 Drizzle 查询 API。

Node.js 环境初始化时 SHALL 启用 SQLite WAL 模式。

迁移 SQL 文件 SHALL 使用 `IF NOT EXISTS` 语句确保幂等性，使迁移在任何数据库历史状态下都能安全执行。

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

#### Scenario: 迁移 SQL 幂等执行

- **WHEN** 迁移 SQL 文件中的 `CREATE TABLE` 语句执行时表已存在
- **THEN** SHALL 使用 `IF NOT EXISTS` 语法，不报错，安全跳过
