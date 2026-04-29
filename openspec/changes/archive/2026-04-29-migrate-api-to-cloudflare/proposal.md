## Why

前端已部署为 Cloudflare Workers 静态资产，但 API 请求（`/api/tickets`）在云端没有后端处理，被 SPA fallback 返回 `index.html`，导致 `Unexpected token '<'` 错误。后端使用 Hono（Workers 原生兼容）和 Drizzle ORM（有 D1 适配器），具备直接迁移到 Cloudflare Workers 的条件。迁移后实现前后端一体化部署，push 即上线。

## What Changes

- 后端运行时从 Node.js（`@hono/node-server` + `better-sqlite3`）迁移到 Cloudflare Workers + D1
- `wrangler.jsonc` 从纯静态资产模式改为带 Worker 脚本模式（新增 `main` 和 D1 binding）
- DB 层从 `better-sqlite3` 切换为 Drizzle 的 D1 驱动，db 实例通过 Hono context 传递
- Worker 入口导出 Hono app（替换 `@hono/node-server` 的 `serve()`）
- 本地开发保留 Node.js 模式（`pnpm dev` 不变），生产环境走 Workers

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `backend-env`: 后端运行时环境从 Node.js + better-sqlite3 变更为 Cloudflare Workers + D1，DB 访问方式从直接导入改为 Hono context 注入
- `dev-tooling`: wrangler.jsonc 从 assets-only Worker 升级为带 Worker 脚本的完整 Worker，新增 D1 binding 和 `main` 字段

## Impact

- **修改文件**: `apps/server/src/app.ts`（工厂模式 + db 中间件类型）、`apps/server/src/index.ts`（使用 db 工厂注入）、`apps/server/src/routes/tickets.ts`（db 从 context 获取）、`wrangler.jsonc`（加 main + D1 binding）
- **新增文件**: `apps/server/src/db/node.ts`（better-sqlite3 工厂）、`apps/server/src/db/d1.ts`（D1 工厂）、`apps/server/src/db/types.ts`（联合类型定义）、`apps/server/src/worker.ts`（Workers 入口）、`apps/server/src/db/seed.ts`（Drizzle ORM 本地播种）、`apps/server/seed.sql`（云端播种 SQL）
- **删除文件**: `apps/server/src/db/index.ts`（替换为工厂模式）
- **依赖变更**: `apps/server` 新增 `@cloudflare/workers-types`（D1 类型定义，devDependency）；保留 `better-sqlite3`、`@hono/node-server`、`dotenv`（本地开发继续使用）
- **构建管线**: Worker 入口由 `wrangler deploy` 内置 esbuild 处理；本地开发不变
- **API 行为**: 所有端点路径和响应格式不变，无 **BREAKING** 变更
- **影响系统**: Cloudflare Workers 部署；本地开发环境不受影响

## Success Criteria

- `pnpm check`（build + test + lint）在本地全绿
- `wrangler deploy` 成功部署前后端一体化 Worker
- Cloudflare 部署后，前端页面能正常调用 API（切换角色不再报 JSON 解析错误）
- 本地 `pnpm dev` 前后端联调正常
