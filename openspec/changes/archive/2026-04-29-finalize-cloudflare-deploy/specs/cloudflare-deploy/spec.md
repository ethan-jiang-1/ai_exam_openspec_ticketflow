## ADDED Requirements

### Requirement: CF-001 Workers + D1 一体化部署配置

`wrangler.jsonc` SHALL 在 DT-007 基础上，声明 Cloudflare Workers + D1 扩展配置，将后端 API 和前端构建产物部署为单一 Worker。

文件 SHALL 额外包含以下配置项（在 DT-007 通用配置之上）：
- `main`: `"./apps/server/src/worker.ts"`（Workers 入口，导入 Hono app 并注入 D1 binding）
- `assets.run_worker_first`: `["/api/*", "/health"]`（API 路径由 Worker 处理，其余走静态资产）
- `d1_databases`: 包含一个绑定，`binding` 为 `"DB"`，`database_name` 为 `"ticketflow-db"`，`database_id` 为有效的 D1 数据库 UUID，`migrations_dir` 为 `"apps/server/drizzle"`

#### Scenario: Workers 部署成功

- **WHEN** 执行 `npx wrangler deploy`
- **THEN** Wrangler SHALL 读取 `main` 字段指定的 Worker 入口，将 Hono API + 静态资产部署为一体化 Worker，不报 database_id 验证错误

#### Scenario: API 端点由 Worker 处理

- **WHEN** 部署成功后访问 `GET /health`
- **THEN** Worker SHALL 返回 `Content-Type: application/json` 响应（由 `run_worker_first` 路由保证）

#### Scenario: D1 数据库绑定可用

- **WHEN** Worker 处理 API 请求时
- **THEN** SHALL 通过 `c.env.DB` 获取 D1 数据库绑定，Drizzle ORM 实例由 `db/d1.ts` 工厂函数创建
