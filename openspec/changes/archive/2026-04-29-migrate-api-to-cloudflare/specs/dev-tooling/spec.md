## MODIFIED Requirements

### Requirement: DT-007 Wrangler 部署配置

仓库根目录 SHALL 包含 `wrangler.jsonc` 文件，声明完整的 Workers 部署配置（Worker 脚本 + 静态资产 + D1 数据库），使 `npx wrangler deploy` 能在 monorepo 根目录成功部署前后端一体化应用。

文件 SHALL 包含以下配置项：
- `name`: `"ticketflow"`
- `compatibility_date`: `"2026-04-29"`
- `main`: `"./apps/server/src/worker.ts"`（指向 Workers 入口文件）
- `assets.directory`: `"./apps/web/dist"`（指向 Vite 构建产物目录）
- `assets.not_found_handling`: `"single-page-application"`（支持 React Router 客户端路由）
- `assets.run_worker_first`: `["/api/*", "/health"]`（API 请求由 Worker 优先处理，其余走 assets + SPA 管道）
- `d1_databases`: 包含一个 binding `DB`，`database_name` 为 `"ticketflow-db"`，`migrations_dir` 指向 `"apps/server/drizzle"`

Worker 脚本通过 `run_worker_first` 配置处理 `/api/*` 和 `/health` 路由，未匹配请求走静态资产管道（含 SPA fallback）。

#### Scenario: Wrangler 配置文件存在且格式正确

- **WHEN** 检查仓库根目录
- **THEN** SHALL 存在 `wrangler.jsonc` 文件，包含 `name`、`compatibility_date`、`main`、`assets`（含 `directory`、`not_found_handling`、`run_worker_first`）、`d1_databases` 配置项

#### Scenario: 部署目标包含前后端

- **WHEN** 执行 `npx wrangler deploy`
- **THEN** Wrangler SHALL 将 `worker.ts` 编译为 Worker 脚本处理 API 路由，同时将 `./apps/web/dist` 目录内容作为静态资产部署

#### Scenario: SPA 路由正确处理

- **WHEN** 用户访问 `/workbench/submitter` 等前端路由路径
- **THEN** Workers SHALL 返回 `index.html`（由 `not_found_handling: "single-page-application"` 保证），而非 404

#### Scenario: API 路由由 Worker 脚本处理

- **WHEN** 用户访问 `/api/tickets`
- **THEN** Worker 脚本 SHALL 匹配该路由，返回 JSON 响应（而非 `index.html`）

#### Scenario: D1 数据库绑定

- **WHEN** Worker 脚本访问 `c.env.DB`
- **THEN** SHALL 获得有效的 D1 数据库 binding，可执行 SQL 查询
