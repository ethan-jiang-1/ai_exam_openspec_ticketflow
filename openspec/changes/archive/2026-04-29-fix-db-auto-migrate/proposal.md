## Why

Cloudflare 部署后所有 API 返回 `Failed query: select ... from "tickets"`——D1 数据库从未应用迁移，`tickets` 表不存在。Node.js 入口也没有 auto-migrate：新 clone 仓库直接 `pnpm dev` 同样会失败（空 DB 无表）。测试能过只是因为 `helpers.ts` 显式调用了 `migrate()`。

根因：设计和 spec 从未要求服务器启动时自动迁移数据库，迁移 SQL 也不保证幂等性。

## What Changes

- 迁移 SQL 文件改为 `CREATE TABLE IF NOT EXISTS`，确保在任何 DB 历史状态下（空 DB、`drizzle-kit push` 创建的、已迁移过的）都能安全执行
- `apps/server/src/index.ts` 添加 `migrate()` 调用，Node.js 入口启动时自动迁移
- `config.yaml` 新增编码约定：服务器入口 SHALL auto-migrate、迁移 SQL SHALL 使用 IF NOT EXISTS

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `backend-env`: BE-001 新增"Node.js 入口 SHALL auto-migrate on startup"要求；BE-003 新增"迁移 SQL SHALL 使用 IF NOT EXISTS 确保幂等性"

## Impact

- `apps/server/drizzle/0000_rainy_doctor_doom.sql` — `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`
- `apps/server/src/index.ts` — 添加 `import { migrate }` 和 `migrate(db, ...)` 调用
- `openspec/config.yaml` — 新增迁移相关编码约定

## Success Criteria

- 删除本地 DB 文件后 `pnpm dev` 自动创建表，`/api/tickets` 返回空数组（非 SQL 错误）
- 用 `drizzle-kit push` 创建表后重启 `pnpm dev` 不 crash（IF NOT EXISTS 保护）
- 多次重启均正常启动
- `pnpm check` build + test + lint 全绿
- Cloudflare Dashboard 加入 migration step 后，push 部署 API 正常返回
