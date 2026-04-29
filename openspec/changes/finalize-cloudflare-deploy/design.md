## Context

`migrate-api-to-cloudflare` 完成了全部代码改动：Worker 入口 (`worker.ts`)、D1 工厂 (`db/d1.ts`)、路由层上下文注入、测试重构。本地 `pnpm check` 全绿（23/23 tests）。`wrangler.jsonc` 已包含 `main`、`d1_databases`、`run_worker_first` 配置，但 `database_id` 为 `"PLACEHOLDER"`。

D1 数据库已在 Cloudflare Dashboard 手动创建：`ticketflow-db`，ID 为 `f74097dc-dcf9-4dce-a3a8-fae898ef4b0a`。`database_id` 已写入 `wrangler.jsonc`。

剩余工作为纯运维：迁移应用 → 部署 → 播种 → 验证，以及 DT-007 spec 同步更新。

## Goals / Non-Goals

**Goals:**

- 完成 Cloudflare Workers + D1 一体化部署，API 和前端在同一 Worker 中运行
- 云端 D1 数据库包含迁移后的 schema 和播种数据
- DT-007 spec 准确反映当前 Workers + D1 部署配置

**Non-Goals:**

- 不修改任何应用代码（代码已在 `migrate-api-to-cloudflare` 中完成）
- 不修改本地开发流程（继续使用 `@hono/node-server` + `better-sqlite3`）
- 不添加 CI/CD 自动化部署（当前为手动部署）
- 不处理 DNS/自定义域名配置

**Dev Proxy 策略**: 本地开发无变化。`pnpm dev` 通过 concurrently 启动 Vite (5173) + Hono (3000)，Vite 的 `server.proxy` 将 `/api/*` 和 `/health` 代理到 Hono。云端部署后由 `run_worker_first` 接管路由分流，无需 dev proxy。

## Decisions

### D1: 云端播种通过 API 端点完成

通过 `curl POST /api/tickets` 调用 Hono 路由端点创建播种数据，而非直接操作 D1。

**理由**: 项目约定禁止原始 SQL（包括 `wrangler d1 execute` 中的 SQL 语句）。API 端点底层走 Drizzle ORM，满足可移植性约束。虽然 D1 控制台支持 SQL 执行，但这违反 config.yaml 中"数据库播种必须通过 ORM API 完成"的规则。

**替代方案**: `wrangler d1 execute ticketflow-db --remote --file=seed.sql` — 被拒绝，违反禁止原始 SQL 约定。

### D2: 迁移文件使用 Drizzle 生成的 SQL

`apps/server/drizzle/` 中已有 `drizzle-kit generate` 生成的迁移 SQL 文件。`wrangler d1 migrations apply` 直接应用这些文件。

**理由**: D1 迁移机制要求 SQL 文件（Wrangler 约束，无法用 ORM API 替代）。这不违反"禁止原始 SQL"约定——这些 SQL 由 Drizzle 工具自动生成，非手写。

### D3: 部署后验证覆盖 API + SPA 两条路径

验证 `GET /health` 返回 JSON（Worker 处理）、`GET /` 返回 HTML（静态资产）、SPA 路由正常（`not_found_handling`）。

**理由**: `run_worker_first: ["/api/*", "/health"]` 是关键路由配置，需要验证 Worker 和静态资产的分流是否正确。

## Risks / Trade-offs

- **[Risk] Wrangler 未认证** → 本地环境无 `CLOUDFLARE_API_TOKEN`，所有 wrangler 操作需用户在已认证环境中执行或提供 token
- **[Risk] D1 无本地模拟** → D1 只能在云端测试，本地开发继续使用 better-sqlite3，两边 schema 一致性依赖 Drizzle 迁移文件保证
- **[Trade-off] 手动播种不可重复** → 每次播种会创建新数据，无幂等性。当前阶段可接受（演示数据），后续如需自动化播种应添加清理逻辑

## Migration Plan

1. 确认 `wrangler.jsonc` 中 `database_id` 已为真实 ID ✓
2. 执行 `wrangler d1 migrations apply ticketflow-db --remote` 应用迁移
3. 推送代码触发 Cloudflare Workers Builds 部署（或本地 `wrangler deploy`）
4. 通过 `curl POST /api/tickets` 播种 5 条演示数据
5. 验证 API + SPA 端点

**Rollback**: 如部署失败，Cloudflare Workers Builds 保留上一版本。可在 Dashboard 回滚。D1 迁移为 add-only（CREATE TABLE），回滚无需操作。

## Directory Layout

```
（无文件变更，仅运维操作）
wrangler.jsonc                        — database_id 已更新（唯一文件变更，已完成）
apps/server/drizzle/                  — 迁移 SQL 文件（由 drizzle-kit generate 生成，已存在）
```

## Configuration Management

| 配置项 | 位置 | 值 | 备注 |
|--------|------|-----|------|
| D1 database_id | `wrangler.jsonc` | `f74097dc-dcf9-4dce-a3a8-fae898ef4b0a` | 已更新 |
| Worker 入口 | `wrangler.jsonc` | `./apps/server/src/worker.ts` | 已配置 |
| D1 binding | `wrangler.jsonc` | `DB` | 已配置 |
| API 路由 | `wrangler.jsonc` | `run_worker_first: ["/api/*", "/health"]` | 已配置 |

## Open Questions

1. Cloudflare Workers Builds 的 `CLOUDFLARE_API_TOKEN` 是否已配置在 CI 环境中？如果未配置，推送后仍会部署失败。
2. `wrangler d1 migrations apply` 是否需要先 `wrangler login`？用户本地环境是否已认证？
