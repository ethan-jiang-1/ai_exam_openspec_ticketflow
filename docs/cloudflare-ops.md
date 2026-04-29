# Cloudflare 部署操作手册

从零开始把 TicketFlow 部署到 Cloudflare Workers + D1 的完整指南。
包含我们踩过的所有坑和最终解决方案。

## 1. 架构总览

```
git push (master)
     │
     ▼
Cloudflare Workers Builds ──── 自动构建部署
     │
     ├── Worker (worker.ts)
     │     ├── /api/*    → Hono 路由 → Drizzle ORM → D1 数据库
     │     └── /health   → { "status": "ok" }
     │
     └── 静态资产 (apps/web/dist)
           └── /*        → React SPA (SPA fallback 到 index.html)
```

**一个 Worker 同时处理 API + 静态资产**，通过 `run_worker_first` 分流：
- `/api/*`、`/health` → Worker 先处理
- 其他请求 → 静态资产管道 → SPA fallback

### 双入口架构

| | 本地 dev | 云端生产 |
|---|---|---|
| 入口 | `index.ts` | `worker.ts` |
| 运行时 | Node.js (`@hono/node-server`) | Cloudflare Workers |
| 数据库 | better-sqlite3 (本地文件) | D1 (云端 binding) |
| DB 来源 | `createDb(dbPath)` | `c.env.DB` D1 binding |
| 迁移 | 启动时自动 `migrate()` | **不会自动执行** |
| 播种 | `pnpm db:seed` | `curl POST /api/tickets` |

`app.ts` 是运行时无关的——路由层通过 `c.get('db')` 获取数据库，不感知底层驱动。

---

## 2. 首次搭建（从零开始）

### 2.1 Cloudflare 账号

1. 注册 https://dash.cloudflare.com
2. 进入 Workers & Pages

### 2.2 创建 D1 数据库

**这步必须手动做，无法通过代码自动化。**

1. Dashboard → Workers & Pages → D1 SQL Database → Create
2. 数据库名称：`ticketflow-db`
3. 创建完成后，记录 **database_id**（一个 UUID，如 `f74097dc-dcf9-4dce-a3a8-fae898ef4b0a`）

> **踩坑记录**：我们一开始 `wrangler.jsonc` 里写的 `database_id: "PLACEHOLDER"`，部署直接报错
> `API error 10021: binding DB must have a valid database_id`。
> 必须用真实 UUID。CLI 的 `npx wrangler d1 create` 需要交互式登录，非交互环境不可用，
> 所以最可靠的方式是在 Dashboard 网页上创建。

### 2.3 配置 wrangler.jsonc

把 D1 database_id 填入：

```jsonc
{
  "name": "ticketflow",
  "compatibility_date": "2026-04-29",
  "main": "./apps/server/src/worker.ts",
  "assets": {
    "directory": "./apps/web/dist",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "/health"]
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ticketflow-db",
      "database_id": "<你的 UUID>",       // ← 必须是真实的
      "migrations_dir": "apps/server/drizzle"
    }
  ]
}
```

关键字段说明：
- `main`: Worker 入口，Wrangler 用内置 esbuild 打包
- `assets.directory`: 前端构建产物目录
- `assets.not_found_handling`: SPA 路由回退
- `assets.run_worker_first`: 这些路径优先走 Worker（不查静态文件）
- `d1_databases.binding`: 代码里通过 `c.env.DB` 获取的变量名
- `d1_databases.migrations_dir`: Wrangler D1 迁移文件目录

### 2.4 连接 Git 仓库（自动部署）

1. Dashboard → Workers & Pages → Create → Connect to Git
2. 选择 GitHub 仓库
3. 构建设置：
   - Build command: `pnpm build`
   - Build output directory: `apps/web/dist`
4. 保存后，每次 push 到 master 自动部署

> **注意**：自动部署只跑 `wrangler deploy`（部署代码和静态资产），**不会自动执行数据库迁移**。
> 如果需要自动迁移，deploy command 改为：
> `npx wrangler d1 migrations apply ticketflow-db --remote && npx wrangler deploy`
> 但这需要 CI 环境配置 `CLOUDFLARE_API_TOKEN` 环境变量。

---

## 3. 数据库迁移

### 3.1 两种迁移机制对比

| | `drizzle-kit push` | `migrate()` | Wrangler D1 |
|---|---|---|---|
| 触发方式 | `pnpm db:migrate` | 启动时自动 | CLI 或 Dashboard |
| 追踪机制 | 无（直接改表结构） | `__drizzle_migrations` journal | `d1_migrations` 表 |
| 适用场景 | 本地快速迭代 | Node.js 自动建表 | D1 云端 |

### 3.2 本地开发（自动）

`index.ts` 启动时自动调用 `migrate(db, { migrationsFolder: './drizzle' })`。
新 clone 仓库 → `pnpm dev` → 表自动创建，开箱即用。

### 3.3 云端 D1（手动）

**这步不会自动执行。`wrangler deploy` 只部署代码，不建表。**

部署后如果 API 报 `Failed query: select ... from "tickets"`，说明表不存在。

**方法 A：Dashboard Console（推荐，最简单）**

1. Dashboard → D1 → ticketflow-db → Console
2. 执行迁移 SQL（见下方 "当前表结构"）

**方法 B：Wrangler CLI**

```bash
npx wrangler d1 migrations apply ticketflow-db --remote
```

> **踩坑记录**：CLI 需要认证。非交互环境报错 "In a non-interactive environment,
> it's necessary to set a CLOUDFLARE_API_TOKEN"。解决方案：
> - 交互式：先 `npx wrangler login`
> - CI 环境：设置 `CLOUDFLARE_API_TOKEN` 环境变量
> - 网络不通：直接用 Dashboard Console

### 3.4 当前表结构

只有 1 张业务表：

```sql
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `status` text DEFAULT 'submitted' NOT NULL,
  `created_by` text NOT NULL,
  `assigned_to` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
```

D1 中的系统表（正常，勿删）：
- `d1_migration` — Wrangler 迁移版本追踪
- `sqlite_sequence` — SQLite 内部 AUTOINCREMENT 追踪（我们未使用 AUTOINCREMENT，此表为空属正常）

### 3.5 为什么迁移 SQL 必须用 IF NOT EXISTS

`drizzle-kit generate` 生成的 SQL 是 `CREATE TABLE`（非幂等）。

但如果 DB 是用 `drizzle-kit push` 创建的，`__drizzle_migrations` 表不存在，
`migrate()` 会认为没迁移过，重跑 SQL → `table already exists` crash。

`IF NOT EXISTS` 让 `migrate()` 在任何 DB 历史状态下都安全：

| DB 状态 | `migrate()` + IF NOT EXISTS |
|---------|---------------------------|
| 空 DB | 建表 + 写 journal |
| 之前 `migrate()` 过 | journal 命中，跳过 |
| 之前 `push` 过 | IF NOT EXISTS → no-op，写 journal |

**每次 `drizzle-kit generate` 后，必须手动在新 SQL 文件中加 `IF NOT EXISTS`。**

这是 config.yaml 的编码约定。

---

## 4. 数据播种

### 本地

```bash
cd apps/server && pnpm db:seed
```

通过 Drizzle ORM insert API 插入 5 条演示数据。

### 云端

D1 无法直接跑 seed.ts（Workers 无文件系统）。通过 API 端点播种：

```bash
# 逐条创建（或写脚本批量）
curl -X POST https://<你的域名>/api/tickets \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Fix login page styling on mobile",
    "description": "The login form overflows on screens narrower than 375px",
    "status": "submitted",
    "createdBy": "alice"
  }'
```

底层走 Drizzle ORM → D1，不涉及原始 SQL。

---

## 5. Schema 变更工作流

当需要修改数据库结构时：

1. 修改 `apps/server/src/db/schema.ts`
2. 生成迁移：`cd apps/server && npx drizzle-kit generate`
3. **手动在新 SQL 文件中加 `IF NOT EXISTS`**
4. 本地验证：
   ```bash
   rm -rf apps/server/data/    # 删掉本地 DB
   pnpm dev                     # 启动，确认自动建表成功
   pnpm check                   # build + test + lint
   ```
5. 提交推送：`git push`
6. 云端建表：Dashboard → D1 → Console → 执行新的迁移 SQL
7. 播种数据（如需要）

---

## 6. 完整部署 Checklist

首次部署或重大变更后，按此清单检查：

- [ ] `wrangler.jsonc` 中 `database_id` 是真实 UUID（不是 PLACEHOLDER）
- [ ] `pnpm check` 全绿（build + 54 tests + lint）
- [ ] `git push` 已触发自动部署
- [ ] D1 Console 中 `tickets` 表存在（如不存在，手动执行 CREATE TABLE SQL）
- [ ] `GET https://<域名>/health` 返回 `{"status":"ok"}`
- [ ] `GET https://<域名>/api/tickets` 返回 JSON 数组（空或有数据）
- [ ] 前端页面加载正常（SPA fallback 生效）
- [ ] 切换角色页面（Submitter / Developer / Manager）不报错
- [ ] 演示数据已播种（如需要）

---

## 7. 故障排查

### 部署报错 `database_id must be valid`

**原因**：`wrangler.jsonc` 中 `database_id` 是 `"PLACEHOLDER"` 或空。

**修复**：Dashboard → D1 → 复制真实 UUID → 粘贴到 `wrangler.jsonc`。

### API 返回 HTML 而不是 JSON

**原因**：`run_worker_first` 没配置或路径不匹配，请求走了 SPA fallback。

**修复**：确认 `wrangler.jsonc` 中 `run_worker_first: ["/api/*", "/health"]`。

### `Failed query: select ... from "tickets"`

**原因**：D1 数据库中没有 `tickets` 表。

**修复**：Dashboard → D1 → Console → 执行 CREATE TABLE SQL（见 3.4）。

### 前端页面白屏 / `Unexpected token '<'`

**原因**：API 请求返回了 HTML（`index.html`），前端按 JSON 解析失败。

**修复**：先确认 API 端点返回 JSON（见上面两条）。

### Wrangler CLI auth 报错

**原因**：非交互环境无法 `wrangler login`。

**解决方法**：
- Dashboard Console 直接执行 SQL（推荐）
- 或设置 `CLOUDFLARE_API_TOKEN` 环境变量

### `migrate()` 本地 crash: `table already exists`

**原因**：DB 之前用 `drizzle-kit push` 创建的，没有 `__drizzle_migrations` 表。

**修复**：确认迁移 SQL 使用 `IF NOT EXISTS`。

---

## 8. 关键文件索引

| 文件 | 用途 |
|------|------|
| `wrangler.jsonc` | Workers + D1 + 静态资产一体化配置 |
| `apps/server/src/worker.ts` | Workers 入口（D1 binding → Drizzle） |
| `apps/server/src/index.ts` | Node.js 入口（auto-migrate on startup） |
| `apps/server/src/app.ts` | 运行时无关的 Hono app 定义 |
| `apps/server/src/db/d1.ts` | D1 Drizzle 工厂函数 |
| `apps/server/src/db/node.ts` | better-sqlite3 Drizzle 工厂函数 |
| `apps/server/src/db/schema.ts` | Drizzle schema 定义（唯一真相源） |
| `apps/server/src/db/seed.ts` | 本地播种脚本（ORM API） |
| `apps/server/drizzle/0000_*.sql` | 迁移 SQL（必须 IF NOT EXISTS） |
| `apps/server/drizzle/meta/_journal.json` | Drizzle migrate() 追踪用 |

### 相关 Spec

| Spec | 覆盖范围 |
|------|----------|
| `cloudflare-deploy/spec.md` (CF-001) | Workers + D1 配置 |
| `backend-env/spec.md` (BE-001) | 双入口架构、auto-migrate |
| `backend-env/spec.md` (BE-003) | Drizzle ORM + 双 DB 后端、IF NOT EXISTS |
| `backend-env/spec.md` (BE-006) | DB 工厂模式 |
| `dev-tooling/spec.md` (DT-007) | 通用部署配置（静态资产） |
