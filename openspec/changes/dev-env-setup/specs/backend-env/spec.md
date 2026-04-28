## ADDED Requirements

### Requirement: Hono API 服务器

`apps/server` SHALL 是一个基于 Hono 框架的 API 服务器，支持 TypeScript，默认监听端口 3000。

#### Scenario: 启动 API 服务器

- **WHEN** 执行 `pnpm dev`（在 apps/server 或根目录）
- **THEN** Hono 服务器 SHALL 启动在端口 3000，支持热重载（使用 tsx watch 或类似工具）

#### Scenario: 健康检查端点

- **WHEN** 向 `GET /health` 发送请求
- **THEN** 服务器 SHALL 返回 `{ status: "ok" }` 和 200 状态码

### Requirement: Drizzle ORM + SQLite 数据库

`apps/server` SHALL 集成 Drizzle ORM，使用 better-sqlite3 作为 SQLite 驱动，数据库文件存放在项目本地。

#### Scenario: 数据库连接初始化

- **WHEN** 服务器启动
- **THEN** Drizzle SHALL 成功连接到本地 SQLite 数据库文件，无需外部数据库服务

#### Scenario: 数据库迁移

- **WHEN** 执行 `pnpm db:migrate`（在 apps/server）
- **THEN** Drizzle SHALL 将 schema 变更应用到 SQLite 数据库

### Requirement: 后端 TypeScript 配置

`apps/server` SHALL 有独立的 `tsconfig.json`，继承根目录的 `tsconfig.base.json`，配置为 Node.js 目标环境。

#### Scenario: 后端 TypeScript 编译无错误

- **WHEN** 在 `apps/server` 中编写使用 Hono 和 Drizzle 的 TypeScript 代码
- **THEN** TypeScript 编译器 SHALL 正确识别所有类型，无编译错误
