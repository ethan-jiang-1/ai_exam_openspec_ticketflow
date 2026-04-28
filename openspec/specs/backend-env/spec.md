# backend-env Specification

## Purpose
TBD - created by archiving change dev-env-setup. Update Purpose after archive.
## Requirements
### Requirement: BE-001 Hono API 服务器

`apps/server` SHALL 是一个基于 Hono 框架的 API 服务器，支持 TypeScript，默认监听 `localhost:3000`（可通过 SERVER_HOST 和 SERVER_PORT 环境变量配置）。

#### Scenario: 启动 API 服务器

- **WHEN** 在根目录执行 `pnpm dev`
- **THEN** Hono 服务器 SHALL 启动在端口 3000，使用 `tsx watch` 实现热重载，控制台输出监听端口信息

#### Scenario: 启动时端口被占用

- **WHEN** 端口 3000 已被其他进程占用
- **THEN** 服务器 SHALL 打印明确的错误信息（包含端口号）并以非零退出码退出

#### Scenario: 健康检查端点

- **WHEN** 向 `GET /health` 发送请求
- **THEN** 服务器 SHALL 返回 `{ "status": "ok" }` 和 200 状态码，Content-Type 为 `application/json`

### Requirement: BE-002 CORS 中间件

`apps/server` SHALL 配置 Hono CORS 中间件，允许开发环境下的跨域请求。

#### Scenario: 跨域请求正常处理

- **WHEN** 从 `http://localhost:5173` 向 `http://localhost:3000` 发送 API 请求
- **THEN** 响应 SHALL 包含 `Access-Control-Allow-Origin` 头，请求正常完成

### Requirement: BE-003 Drizzle ORM + SQLite 数据库

`apps/server` SHALL 集成 Drizzle ORM，使用 better-sqlite3 作为 SQLite 驱动，数据库文件路径由 `DATABASE_PATH` 环境变量指定，默认为 `./data/ticketflow.db`。初始化时 SHALL 启用 SQLite WAL 模式。

#### Scenario: 数据库连接初始化

- **WHEN** 服务器启动
- **THEN** Drizzle SHALL 成功连接到 `DATABASE_PATH` 指定的 SQLite 数据库文件（路径相对于项目根目录解析），启用 WAL 模式（`PRAGMA journal_mode=WAL`）。若文件不存在，SHALL 自动创建；若所在目录不存在，SHALL 自动创建目录

#### Scenario: 数据库迁移

- **WHEN** 在 `apps/server` 目录执行 `pnpm db:migrate`
- **THEN** Drizzle Kit SHALL 读取 `drizzle.config.ts` 并将 schema 变更应用到 SQLite 数据库

#### Scenario: 数据库文件被 gitignore

- **WHEN** SQLite 数据库文件被创建在项目目录中
- **THEN** `*.db`、`*.db-journal`、`*.db-wal` 文件 SHALL 被 `.gitignore` 忽略，不进入版本控制

### Requirement: BE-004 后端 TypeScript 配置

`apps/server` SHALL 有独立的 `tsconfig.json`，继承根目录的 `tsconfig.base.json`，配置 target: ESNext, module: ESNext。

#### Scenario: 后端 TypeScript 编译无错误

- **WHEN** 在 `apps/server` 中编写使用 Hono 和 Drizzle 的 TypeScript 代码
- **THEN** `npx tsc --noEmit`（在 apps/server 目录）SHALL 退出码为 0，无编译错误

### Requirement: BE-005 API 错误处理

`apps/server` SHALL 配置全局错误处理中间件，统一 API 错误响应格式。

#### Scenario: 未捕获的异常返回统一错误格式

- **WHEN** API 处理过程中抛出未捕获的异常
- **THEN** 响应 SHALL 为 `{ "error": "<错误描述>", "code": "INTERNAL_ERROR" }`，HTTP 状态码为 500，Content-Type 为 `application/json`

