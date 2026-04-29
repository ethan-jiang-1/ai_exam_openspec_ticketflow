## ADDED Requirements

### Requirement: DT-007 Wrangler 静态资产部署配置

仓库根目录 SHALL 包含 `wrangler.jsonc` 文件，声明 Workers assets-only 部署配置，使 `npx wrangler deploy` 能在 monorepo 根目录成功执行。

文件 SHALL 包含以下配置项：
- `name`: `"ticketflow"`
- `compatibility_date`: `"2026-04-29"`
- `assets.directory`: `"./apps/web/dist"`（指向 Vite 构建产物目录）
- `assets.not_found_handling`: `"single-page-application"`（支持 React Router 客户端路由）

文件 SHALL NOT 包含 `main` 字段（纯静态资产部署，无 Worker 脚本）。

#### Scenario: Wrangler 配置文件存在且格式正确

- **WHEN** 检查仓库根目录
- **THEN** SHALL 存在 `wrangler.jsonc` 文件，包含 `name`、`compatibility_date`、`assets` 三个顶层键

#### Scenario: 部署目标指向前端构建产物

- **WHEN** Cloudflare 构建完成，执行 `npx wrangler deploy`
- **THEN** Wrangler SHALL 读取 `wrangler.jsonc` 中 `assets.directory` 配置，将 `./apps/web/dist` 目录内容作为静态资产部署，不报 "workspace root" 错误

#### Scenario: SPA 路由正确处理

- **WHEN** 用户访问 `/workbench/submitter` 等前端路由路径
- **THEN** Workers SHALL 返回 `index.html`（由 `not_found_handling: "single-page-application"` 保证），而非 404
