## Why

`migrate-api-to-cloudflare` 完成了代码层面的 Workers + D1 迁移，但 `wrangler.jsonc` 中 `database_id` 仍为 `"PLACEHOLDER"`，导致 Cloudflare Workers Builds 部署失败（API error 10021: binding DB must have a valid database_id）。同时 DT-007 spec 仍描述纯静态部署，与当前 Workers + D1 一体化架构不符。

## What Changes

- 将 `wrangler.jsonc` 的 `database_id` 替换为真实 D1 数据库 ID（已在 Dashboard 创建）
- 通过 `wrangler d1 migrations apply` 将 Drizzle 迁移应用到远程 D1
- 触发 Cloudflare Workers Builds 部署，验证 API 端点返回 JSON（非 HTML）
- 通过 `curl POST /api/tickets` 完成云端播种（全程走 Drizzle ORM，无原始 SQL）
- 更新 DT-007 spec：从"纯静态资产部署"改为"Workers + D1 + 静态资产一体化部署"

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `dev-tooling`: DT-007 从"静态资产部署"更新为"Workers + D1 + 静态资产一体化部署"，新增 D1 绑定和 `run_worker_first` 配置要求

## Impact

- `wrangler.jsonc` — `database_id` 从 `"PLACEHOLDER"` 替换为 `"f74097dc-dcf9-4dce-a3a8-fae898ef4b0a"`（已完成）
- `openspec/specs/dev-tooling/spec.md` — DT-007 需求内容更新
- Cloudflare D1 远程数据库 — 应用 Drizzle 迁移 + 播种数据
- Cloudflare Workers Builds — 重新部署，验证一体化 Worker 正常工作

## Success Criteria

- `wrangler d1 migrations apply ticketflow-db --remote` 成功执行
- `wrangler deploy` 成功部署，API 端点（`GET /health`、`GET /api/tickets`）返回 JSON
- 前端 SPA 路由（如 `/workbench/submitter`）正常渲染
- 云端数据库包含播种数据（`GET /api/tickets` 返回 5 条记录）
- DT-007 spec 反映 Workers + D1 配置
