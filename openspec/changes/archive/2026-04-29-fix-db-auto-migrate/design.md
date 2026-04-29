## Context

Drizzle 的 `migrate()` 通过 `__drizzle_migrations` 表追踪已应用的迁移。它比较 journal 中的 timestamp，只应用新的。但项目的 `db:migrate` 脚本实际跑的是 `drizzle-kit push`（不走 journal）。

如果 DB 是用 `push` 创建的，`__drizzle_migrations` 不存在，`migrate()` 会认为没有迁移过，重跑 `CREATE TABLE tickets` → crash。

迁移 SQL 文件使用的是 `CREATE TABLE`（非幂等），表已存在时会报 `table already exists`。

## Goals / Non-Goals

**Goals:**

- 服务器启动时自动迁移数据库，新 clone 仓库 `pnpm dev` 开箱即用
- 迁移机制对任何 DB 历史状态都安全（空、push 过、已迁移过）
- D1 数据库在部署时通过 Wrangler CLI 应用迁移

**Non-Goals:**

- 不修改 Worker 入口（D1 不支持 runtime migration）
- 不修改测试 helper（已经正确使用 `migrate()`）
- 不替换 `drizzle-kit push` 为其他命令

## Decisions

### D1: 迁移 SQL 使用 IF NOT EXISTS

把 `CREATE TABLE tickets` 改为 `CREATE TABLE IF NOT EXISTS tickets`。

**理由**: `drizzle-kit generate` 生成的 SQL 是非幂等的。如果 DB 已经有表（来自之前的 `push` 或手动创建），普通 `CREATE TABLE` 会 crash。`IF NOT EXISTS` 使 SQL 在任何状态下都安全。

**替代方案**: 用 `drizzle-kit push` 替代 `migrate()`——但 push 是 CLI 工具，不适合在代码中调用。

### D2: Node.js 入口调用 migrate()

在 `index.ts` 的 `createDb()` 后调用 `migrate(db, { migrationsFolder: './drizzle' })`。

**理由**: 与 `__tests__/helpers.ts` 完全相同的模式。`migrate()` 是幂等的（journal 追踪 + IF NOT EXISTS 双重保障）。`./drizzle` 路径正确（CWD 是 `apps/server/`）。

### D3: Cloudflare D1 迁移通过 Wrangler CLI

在 Cloudflare Workers Builds 的 deploy command 中加入 `npx wrangler d1 migrations apply ticketflow-db --remote`。这是 D1 官方机制，Worker runtime 无法做 migration。

## Risks / Trade-offs

- **[Risk] drizzle-kit generate 会覆盖 IF NOT EXISTS** → 后续如果重新 generate 迁移文件，需要手动加回 `IF NOT EXISTS`。通过 config.yaml 约束提醒。
- **[Trade-off] push 和 migrate 共存** → `db:migrate` 仍用 push，启动时用 migrate。两者通过 IF NOT EXISTS 兼容，但长期应统一为一种策略。

## Directory Layout

```
apps/server/drizzle/0000_rainy_doctor_doom.sql  — 改为 IF NOT EXISTS
apps/server/src/index.ts                        — 加 migrate() 调用
```

## Configuration Management

| 配置项 | 位置 | 当前值 | 改动 |
|--------|------|--------|------|
| 迁移 SQL 幂等性 | `drizzle/0000_*.sql` | `CREATE TABLE` | → `CREATE TABLE IF NOT EXISTS` |
| Auto-migrate | `src/index.ts` | 无 | 加 `migrate(db, ...)` |
| D1 migration | Cloudflare Dashboard | 仅 `wrangler deploy` | 加 `wrangler d1 migrations apply` |

## Open Questions

1. Cloudflare Workers Builds 的 deploy command 是否支持在 `wrangler deploy` 前执行 `wrangler d1 migrations apply`？CI 环境是否有 D1 操作权限？
2. `drizzle-kit generate` 重新运行后，config.yaml 的约定能否有效提醒开发者手动加回 `IF NOT EXISTS`？
