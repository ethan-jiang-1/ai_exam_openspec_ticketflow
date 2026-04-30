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
| 播种 | `pnpm db:seed`（users + tickets） | D1 Console 插入 users + `curl POST /api/tickets` |

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

2 张业务表：

```sql
-- 0000: tickets 表（初始）
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `status` text DEFAULT 'submitted' NOT NULL,
  `priority` text DEFAULT 'medium' NOT NULL,
  `due_date` text,
  `created_by` text NOT NULL,
  `assigned_to` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
```

```sql
-- 0001: users 表
CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `username` text NOT NULL,
  `display_name` text NOT NULL,
  `role` text NOT NULL,
  `password_hash` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL
);
```

```sql
-- 0002: users username 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique` ON `users` (`username`);
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

### 3.6 迁移历史

| 文件 | 内容 | 来源 |
|------|------|------|
| `0000_rainy_doctor_doom.sql` | tickets 表（初始） | drizzle-kit generate |
| `0001_create_users.sql` | users 表 | mvp-user-auth（手写） |
| `0002_users_username_idx.sql` | users.username 唯一索引 | mvp-user-auth（手写） |
| `0003_add_priority.sql` | tickets 表新增 priority 列 | mvp-ticket-enrichment |
| `0004_add_due_date.sql` | tickets 表新增 due_date 列 | mvp-ticket-enrichment |
| `0005_add_password_hash.sql` | users 表新增 password_hash 列 | mvp-user-management |

**每次新增迁移文件后需要做的事：**
1. 在 `meta/_journal.json` 的 `entries` 数组末尾追加一条 `{idx, version, when, tag, breakpoints}` 记录
2. 确保文件只包含一条 SQL 语句
3. 确保使用 `IF NOT EXISTS`
4. 本地验证：删掉 `data/ticketflow.db` → 重启 dev server → 表自动创建
5. 云端：Dashboard → D1 → Console → 执行新迁移 SQL

---

## 4. 数据播种

### 本地

```bash
cd apps/server && pnpm db:seed
```

通过 Drizzle ORM insert API 插入 5 条演示数据。

### 云端

D1 无法直接跑 seed.ts（Workers 无文件系统）。分两步：

**步骤 1：在 D1 Console 插入预置用户**

Dashboard → D1 → ticketflow-db → Console，执行：

```sql
INSERT OR IGNORE INTO `users` (`id`, `username`, `display_name`, `role`, `password_hash`, `created_at`) VALUES
  ('u-00000000-0000-0000-0000-000000000001', 'submitter', '提交者', 'submitter', '5cb16417fc52425121b2df3d6d3792874dff7e40a2d4dc9c8c5f13b66cf94a1c:76da450a1eda2144273058d383ff3a8d57f9bfc523d770614383355685f89a9e', '2026-01-01T00:00:00Z'),
  ('u-00000000-0000-0000-0000-000000000002', 'dispatcher', '调度者', 'dispatcher', 'acc18b5634b47758078ff9c96cc4bbb9fb3eb33abfcf6a34d1c2f5f60b2da4ef:3123ca69a4b61f31184920ff44adde7276f44c0e1e010969c6651839b357e1ea', '2026-01-01T00:00:00Z'),
  ('u-00000000-0000-0000-0000-000000000003', 'completer', '完成者', 'completer', 'b67c9d5960c3dcf428764debf4c64d8bea6fcb3641287f7e84f6e591294bccb3:51db018ebce0894ceedb06d05633ccd43dcddf547c961183080ad8482f08eb87f', '2026-01-01T00:00:00Z'),
  ('u-00000000-0000-0000-0000-000000000004', 'admin', '管理员', 'admin', '8d5b7927cd47cd7c28759a21ad45b6b08a7484a276a9dbcbc6487b068bb634ed:da0db2dec8169f1880e575c680df1e74bf6250631838b8d4895d58b751bcad90', '2026-01-01T00:00:00Z');
```

> 密码：submitter/dispatcher/completer 的密码为 `changeme`，admin 的密码为 `admin`。上表中的 `password_hash` 是 `salt:hash` 格式的 PBKDF2-SHA256 值（100k 次迭代）。

**步骤 2：通过 API 播种 tickets**

先登录获取 cookie，再创建工单：

```bash
# 登录（获取 session cookie）
curl -c cookies.txt -X POST https://<你的域名>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username": "submitter", "password": "changeme"}'

# 创建工单
curl -b cookies.txt -X POST https://<你的域名>/api/tickets \
  -H 'Content-Type: application/json' \
  -d '{"title": "Fix login page styling on mobile", "description": "The login form overflows on screens narrower than 375px"}'
```

底层走 Drizzle ORM → D1，不涉及原始 SQL（预置用户除外，因 D1 Console 不支持 ORM）。

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
- [ ] `pnpm check` 全绿（build + tests + lint）
- [ ] `git push` 已触发自动部署
- [ ] D1 Console 中 `tickets` 表和 `users` 表均存在（含 `password_hash`、`priority`、`due_date` 列）
- [ ] D1 Console 中 4 个预置用户已插入（含 password_hash，见 4.云端 步骤 1）
- [ ] `GET https://<域名>/health` 返回 `{"status":"ok"}`
- [ ] `GET https://<域名>/api/auth/users` 返回 4 个预置用户
- [ ] `POST https://<域名>/api/auth/login` 使用 `{username, password}` 登录成功并设置 cookie
- [ ] `GET https://<域名>/api/tickets`（带 cookie）返回 JSON 数组
- [ ] 前端页面加载正常：访问 `/login` 显示密码输入框 + 登录按钮
- [ ] 输入正确密码 → 登录成功 → 跳转到对应角色工作台
- [ ] admin 登录 → 可访问 `/workbench/admin` → 查看/新增/编辑/删除用户
- [ ] 退出按钮 → 返回 `/login`
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

### API 返回 401 `未登录`

**原因**：需要认证的端点（/api/tickets、/api/auth/me、/api/auth/logout）未携带 session cookie。

**修复**：先通过 `POST /api/auth/login` 获取 cookie，后续请求携带该 cookie。

### `Failed query: select ... from "users"`

**原因**：D1 数据库中没有 `users` 表（新增于 mvp-user-auth）。

**修复**：Dashboard → D1 → Console → 执行 0001 和 0002 迁移 SQL（见 3.4）。

### 迁移文件包含多条 SQL 语句导致 `migrate()` 报错

**原因**：better-sqlite3 的 `prepare()` 只接受一条 SQL 语句。

**修复**：每个迁移文件只放一条 SQL 语句（如 users 表和 username 索引分开放在 0001 和 0002）。

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
| `apps/server/src/db/seed.ts` | 本地播种脚本（ORM API，幂等） |
| `apps/server/src/lib/sessions.ts` | Session 存储服务（内存 Map） |
| `apps/server/src/lib/password.ts` | PBKDF2-SHA256 密码 hash/verify |
| `apps/server/src/lib/permissions.ts` | RBAC 权限映射 |
| `apps/server/src/middleware/auth.ts` | Auth 中间件（session 注入 + requireAuth，排除 passwordHash） |
| `apps/server/src/routes/auth.ts` | Auth API（login/logout/me/users，密码登录） |
| `apps/server/src/routes/admin.ts` | Admin API（用户 CRUD，需 user:manage 权限） |
| `apps/server/drizzle/0000_*.sql` | 迁移 SQL：tickets 表 |
| `apps/server/drizzle/0001_*.sql` | 迁移 SQL：users 表 |
| `apps/server/drizzle/0002_*.sql` | 迁移 SQL：users username 唯一索引 |
| `apps/server/drizzle/0003_*.sql` | 迁移 SQL：tickets priority 列 |
| `apps/server/drizzle/0004_*.sql` | 迁移 SQL：tickets due_date 列 |
| `apps/server/drizzle/0005_*.sql` | 迁移 SQL：users password_hash 列 |
| `apps/server/drizzle/meta/_journal.json` | Drizzle migrate() 追踪用 |
| `apps/web/src/pages/AdminWorkbench.tsx` | 管理员工作台（用户管理） |

### 相关 Spec

| Spec | 覆盖范围 |
|------|----------|
| `cloudflare-deploy/spec.md` (CF-001) | Workers + D1 配置 |
| `backend-env/spec.md` (BE-001) | 双入口架构、auto-migrate |
| `backend-env/spec.md` (BE-003) | Drizzle ORM + 双 DB 后端、IF NOT EXISTS |
| `backend-env/spec.md` (BE-006) | DB 工厂模式 |
| `dev-tooling/spec.md` (DT-007) | 通用部署配置（静态资产） |

---

## 9. 云端数据库迁移 & 播种快速参考

> **现状**：Cloudflare Workers Builds 只部署代码和静态资产，**不会自动执行数据库迁移和播种**。
> 每次涉及 schema 变更的部署后，必须手动在 D1 Console 完成这两步。
> 本地 `index.ts` 启动时自动 migrate，seed 通过 `pnpm db:seed` 执行，但云端 `worker.ts` 没有这个能力。

### 9.1 每次部署后的操作流程

```
git push (master)
     │
     ▼
Cloudflare 自动构建部署 ←── 代码部署 ✓，数据库不动 ✗
     │
     ├── 如果本次变更涉及 schema 变化 ──→ 去做 9.2（迁移）
     ├── 如果本次变更涉及新数据 ──────→ 去做 9.3（播种）
     └── 如果只是前端/逻辑变更 ──────→ 无需操作
```

**如何判断是否涉及 schema 变化：**
- `apps/server/src/db/schema.ts` 有改动 → 需要迁移
- `apps/server/drizzle/` 下有新 SQL 文件 → 需要迁移
- `apps/server/src/db/seed.ts` 有改动 → 可能需要重新播种

### 9.2 迁移：在 D1 Console 执行 SQL

路径：Dashboard → Workers & Pages → D1 → ticketflow-db → Console

**全部迁移 SQL（按顺序，可重复执行，IF NOT EXISTS 保证幂等）：**

```sql
-- 0000: tickets 表
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `status` text DEFAULT 'submitted' NOT NULL,
  `priority` text DEFAULT 'medium' NOT NULL,
  `due_date` text,
  `created_by` text NOT NULL,
  `assigned_to` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
```

```sql
-- 0001: users 表
CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `username` text NOT NULL,
  `display_name` text NOT NULL,
  `role` text NOT NULL,
  `password_hash` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL
);
```

```sql
-- 0002: users username 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique` ON `users` (`username`);
```

> **Tips**: 因为全部使用 `IF NOT EXISTS`，你可以把三条 SQL 全部粘贴执行，已存在的会自动跳过。
> 新迁移文件加入后，只需追加执行新的一条即可。

### 9.3 播种：插入预置用户

路径同上，D1 Console 执行：

```sql
INSERT OR IGNORE INTO `users` (`id`, `username`, `display_name`, `role`, `password_hash`, `created_at`) VALUES
  ('u-00000000-0000-0000-0000-000000000001', 'submitter', '提交者', 'submitter', '5cb16417fc52425121b2df3d6d3792874dff7e40a2d4dc9c8c5f13b66cf94a1c:76da450a1eda2144273058d383ff3a8d57f9bfc523d770614383355685f89a9e', '2026-01-01T00:00:00Z'),
  ('u-00000000-0000-0000-0000-000000000002', 'dispatcher', '调度者', 'dispatcher', 'acc18b5634b47758078ff9c96cc4bbb9fb3eb33abfcf6a34d1c2f5f60b2da4ef:3123ca69a4b61f31184920ff44adde7276f44c0e1e010969c6651839b357e1ea', '2026-01-01T00:00:00Z'),
  ('u-00000000-0000-0000-0000-000000000003', 'completer', '完成者', 'completer', 'b67c9d5960c3dcf428764debf4c64d8bea6fcb3641287f7e84f6e591294bccb3:51db018ebce0894ceedb06d05633ccd43dcddf547c961183080ad8482f08eb87f', '2026-01-01T00:00:00Z'),
  ('u-00000000-0000-0000-0000-000000000004', 'admin', '管理员', 'admin', '8d5b7927cd47cd7c28759a21ad45b6b08a7484a276a9dbcbc6487b068bb634ed:da0db2dec8169f1880e575c680df1e74bf6250631838b8d4895d58b751bcad90', '2026-01-01T00:00:00Z');
```

> 密码：submitter/dispatcher/completer → `changeme`，admin → `admin`。`INSERT OR IGNORE` 保证可重复执行（username 已存在则跳过）。

**播种 tickets（可选）：**

登录获取 cookie 后通过 API 创建（`createdBy` 由后端从 session 自动获取）：

```bash
curl -c cookies.txt -X POST https://<域名>/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username": "submitter", "password": "changeme"}'

curl -b cookies.txt -X POST https://<域名>/api/tickets \
  -H 'Content-Type: application/json' \
  -d '{"title": "Fix login page styling", "description": "Overflow on narrow screens"}'
```

### 9.4 踩坑记录

| 时间 | 问题 | 原因 | 解决 |
|------|------|------|------|
| mvp-user-auth | 部署后登录页空白 | D1 没有 `users` 表 | Console 执行 0001 + 0002 SQL |
| mvp-user-auth | `Could not resolve "crypto"` | `sessions.ts` 用了 Node.js 专属 import | 改用全局 `crypto.randomUUID()`（fix-cloudflare-crypto） |
| mvp-user-auth | `migrate()` 本地 crash | 迁移文件含多条 SQL | 拆分为单语句文件（0001 + 0002） |
| mvp-user-management | 部署后登录失败 | D1 未执行 0005 password_hash migration，或预置用户 SQL 缺少 password_hash | Console 执行 0005 SQL，确保 users 表含 password_hash 列 |
| 日常 | Cloudflare 构建用旧 commit | 短时间多次 push，中间构建失败 | Dashboard 点 Rebuild 用最新 commit |
| 日常 | Wrangler CLI auth 失败 | 非交互环境无法 login | 用 Dashboard Console 替代 |

### 9.5 未来改进方向

当前云端迁移和播种都是手动操作，后续可考虑：

1. **自动迁移**：在 deploy command 前加 `npx wrangler d1 migrations apply ticketflow-db --remote`（需配置 `CLOUDFLARE_API_TOKEN`）
2. **自动播种**：新增一个 `/api/admin/seed` 端点（需认证 + 管理员角色），首次部署后调用一次
3. **构建时验证**：在 CI 中增加 `wrangler deploy --dry-run` 步骤，提前发现打包问题
