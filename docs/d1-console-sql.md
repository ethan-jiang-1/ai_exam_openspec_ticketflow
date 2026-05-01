# D1 Console 迁移 + 播种 SQL

TicketFlow Cloudflare D1 数据库操作手册。按顺序在 D1 Console 中逐段粘贴执行。

路径：Cloudflare Dashboard → Workers & Pages → D1 → ticketflow-db → Console

> **原则**：所有语句使用 `IF NOT EXISTS` / `INSERT OR IGNORE`，可重复执行不丢数据。
> **例外**：0003/0004/0005 是 `ALTER TABLE ADD COLUMN`，SQLite 不支持 `IF NOT EXISTS`，如果列已存在会报错，跳过继续即可。

---

## 第一组：建表（0000-0002）

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

CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `username` text NOT NULL,
  `display_name` text NOT NULL,
  `role` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique` ON `users` (`username`);
```

---

## 第二组：补列（0003-0005）

> ⚠️ 这三条是 `ALTER TABLE ADD COLUMN`，如果列已存在会报错。**报错可忽略**，跳过继续。

```sql
ALTER TABLE tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE tickets ADD COLUMN due_date TEXT;

ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
```

---

## 第三组：ticket_history 表 + 索引 + 回填（0006-0009）

```sql
CREATE TABLE IF NOT EXISTS ticket_history (
  id TEXT PRIMARY KEY NOT NULL,
  ticket_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_history_action ON ticket_history(action, created_at);

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
SELECT lower(hex(randomblob(16))), id, 'created', created_by, NULL, 'submitted', NULL, created_at
FROM tickets;
```

---

## 第四组：预置用户

```sql
INSERT OR IGNORE INTO `users` (`id`, `username`, `display_name`, `role`, `password_hash`, `created_at`) VALUES
  ('u-00000000-0000-0000-0000-000000000001', 'submitter', '提交者', 'submitter', '5cb16417fc52425121b2df3d6d3792874dff7e40a2d4dc9c8c5f13b66cf94a1c:76da450a1eda2144273058d383ff3a8d57f9bfc523d770614383355685f89a9e', '2026-01-01T00:00:00Z'),
  ('u-00000000-0000-0000-0000-000000000002', 'dispatcher', '调度者', 'dispatcher', 'acc18b5634b47758078ff9c96cc4bbb9fb3eb33abfcf6a34d1c2f5f60b2da4ef:3123ca69a4b61f31184920ff44adde7276f44c0e1e010969c6651839b357e1ea', '2026-01-01T00:00:00Z'),
  ('u-00000000-0000-0000-0000-000000000003', 'completer', '完成者', 'completer', 'b67c9d5960c3dcf428764debf4c64d8bea6fcb3641287f7e84f6e591294bccb3:51db018ebce0894ceedb06d05633ccd43dcddf547c961183080ad8482f08eb87f', '2026-01-01T00:00:00Z'),
  ('u-00000000-0000-0000-0000-000000000004', 'admin', '管理员', 'admin', '8d5b7927cd47cd7c28759a21ad45b6b08a7484a276a9dbcbc6487b068bb634ed:da0db2dec8169f1880e575c680df1e74bf6250631838b8d4895d58b751bcad90', '2026-01-01T00:00:00Z'),
  ('u-00000000-0000-0000-0000-000000000005', 'completer2', '完成者2', 'completer', 'b67c9d5960c3dcf428764debf4c64d8bea6fcb3641287f7e84f6e591294bccb3:51db018ebce0894ceedb06d05633ccd43dcddf547c961183080ad8482f08eb87f', '2026-01-01T00:00:00Z');
```

> 密码：submitter/dispatcher/completer/completer2 → `changeme`，admin → `admin`

---

## 第五组：Dashboard 演示数据

> 12 个工单 + 完整 ticket_history 生命周期。使用 `datetime('now', ...)` 相对时间，随时执行都能产生合理的 Dashboard 指标。

```sql
INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-01', '移动端登录页布局溢出', '屏幕宽度小于 375px 时登录表单溢出，需响应式适配。', 'submitted', 'high', '2026-05-15', 'submitter', NULL,
        datetime('now', '-3 hours'), datetime('now', '-3 hours'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-01a', 't-seed-01', 'created', 'submitter', NULL, 'submitted', NULL, datetime('now', '-3 hours'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-02', '新增暗色模式支持', '用户希望支持系统偏好自适应的暗色主题。', 'submitted', 'low', NULL, 'submitter', NULL,
        datetime('now', '-2 hours'), datetime('now', '-2 hours'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-02a', 't-seed-02', 'created', 'submitter', NULL, 'submitted', NULL, datetime('now', '-2 hours'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-03', '工单列表增加后端分页', '当前一次性加载全部数据，超过 200 条时页面卡顿。', 'submitted', 'medium', '2026-05-30', 'submitter', NULL,
        datetime('now', '-1 hours'), datetime('now', '-1 hours'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-03a', 't-seed-03', 'created', 'submitter', NULL, 'submitted', NULL, datetime('now', '-1 hours'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-04', 'Dashboard 数据库查询优化', 'Dashboard 在工单 >1000 时加载缓慢，需对 tickets 表加索引。', 'assigned', 'medium', '2026-05-20', 'dispatcher', 'completer',
        datetime('now', '-5 days'), datetime('now', '-5 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-04a', 't-seed-04', 'created', 'dispatcher', NULL, 'submitted', NULL, datetime('now', '-5 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-04b', 't-seed-04', 'assigned', 'dispatcher', 'submitted', 'assigned', '{"assignee":"completer"}', datetime('now', '-5 days'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-05', '实现邮件通知功能', '工单指派或完成时发送邮件通知相关人员，使用 SendGrid API。', 'assigned', 'high', '2026-05-10', 'submitter', 'completer',
        datetime('now', '-4 days'), datetime('now', '-1 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-05a', 't-seed-05', 'created', 'submitter', NULL, 'submitted', NULL, datetime('now', '-4 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-05b', 't-seed-05', 'assigned', 'dispatcher', 'submitted', 'assigned', '{"assignee":"completer2"}', datetime('now', '-4 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-05c', 't-seed-05', 'reassigned', 'dispatcher', 'assigned', 'assigned', '{"assignee":"completer","prevAssignee":"completer2"}', datetime('now', '-1 days'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-06', '修复 Safari 下日期选择器异常', 'Safari 17 下 DatePicker 弹出层位置偏移。', 'assigned', 'high', NULL, 'submitter', 'completer',
        datetime('now', '-3 days'), datetime('now', '-20 hours'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-06a', 't-seed-06', 'created', 'submitter', NULL, 'submitted', NULL, datetime('now', '-3 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-06b', 't-seed-06', 'assigned', 'dispatcher', 'submitted', 'assigned', '{"assignee":"completer"}', datetime('now', '-20 hours'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-07', '重构权限校验中间件', '权限逻辑散落在各路由中，需抽到统一的 permission middleware。', 'in_progress', 'high', '2026-05-08', 'admin', 'completer',
        datetime('now', '-6 days'), datetime('now', '-10 hours'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-07a', 't-seed-07', 'created', 'admin', NULL, 'submitted', NULL, datetime('now', '-6 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-07b', 't-seed-07', 'assigned', 'dispatcher', 'submitted', 'assigned', '{"assignee":"completer"}', datetime('now', '-5 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-07c', 't-seed-07', 'started', 'completer', 'assigned', 'in_progress', NULL, datetime('now', '-10 hours'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-08', '前端 E2E 测试覆盖登录流程', '补充登录页和 401 自动跳转的 Playwright 测试。', 'in_progress', 'medium', NULL, 'dispatcher', 'completer2',
        datetime('now', '-4 days'), datetime('now', '-5 hours'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-08a', 't-seed-08', 'created', 'dispatcher', NULL, 'submitted', NULL, datetime('now', '-4 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-08b', 't-seed-08', 'assigned', 'dispatcher', 'submitted', 'assigned', '{"assignee":"completer2"}', datetime('now', '-3 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-08c', 't-seed-08', 'started', 'completer2', 'assigned', 'in_progress', NULL, datetime('now', '-5 hours'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-09', '编写 API 文档', '为所有 REST 接口编写请求/响应示例文档。', 'completed', 'medium', NULL, 'dispatcher', 'completer',
        datetime('now', '-7 days'), datetime('now', '-1 hours'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-09a', 't-seed-09', 'created', 'dispatcher', NULL, 'submitted', NULL, datetime('now', '-7 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-09b', 't-seed-09', 'assigned', 'dispatcher', 'submitted', 'assigned', '{"assignee":"completer"}', datetime('now', '-6 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-09c', 't-seed-09', 'started', 'completer', 'assigned', 'in_progress', NULL, datetime('now', '-3 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-09d', 't-seed-09', 'completed', 'completer', 'in_progress', 'completed', NULL, datetime('now', '-1 hours'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-10', 'Session 24h TTL + 401 拦截', '会话过期时间改为 24 小时，401 时前端自动跳转登录页。', 'completed', 'high', '2026-04-28', 'admin', 'completer',
        datetime('now', '-8 days'), datetime('now', '-2 hours'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-10a', 't-seed-10', 'created', 'admin', NULL, 'submitted', NULL, datetime('now', '-8 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-10b', 't-seed-10', 'assigned', 'dispatcher', 'submitted', 'assigned', '{"assignee":"completer"}', datetime('now', '-7 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-10c', 't-seed-10', 'started', 'completer', 'assigned', 'in_progress', NULL, datetime('now', '-5 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-10d', 't-seed-10', 'completed', 'completer', 'in_progress', 'completed', NULL, datetime('now', '-2 hours'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-11', '工单详情页优化', 'Drawer 内 Timeline 样式调整，增加 actor 中文显示名。', 'completed', 'high', NULL, 'submitter', 'completer2',
        datetime('now', '-6 days'), datetime('now', '-3 hours'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-11a', 't-seed-11', 'created', 'submitter', NULL, 'submitted', NULL, datetime('now', '-6 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-11b', 't-seed-11', 'assigned', 'dispatcher', 'submitted', 'assigned', '{"assignee":"completer2"}', datetime('now', '-5 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-11c', 't-seed-11', 'started', 'completer2', 'assigned', 'in_progress', NULL, datetime('now', '-2 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-11d', 't-seed-11', 'completed', 'completer2', 'in_progress', 'completed', NULL, datetime('now', '-3 hours'));

INSERT OR IGNORE INTO tickets (id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at)
VALUES ('t-seed-12', 'README 更新部署文档', '补充 Cloudflare D1 迁移步骤和常见问题。', 'completed', 'low', NULL, 'admin', 'completer',
        datetime('now', '-12 days'), datetime('now', '-7 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-12a', 't-seed-12', 'created', 'admin', NULL, 'submitted', NULL, datetime('now', '-12 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-12b', 't-seed-12', 'assigned', 'dispatcher', 'submitted', 'assigned', '{"assignee":"completer"}', datetime('now', '-11 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-12c', 't-seed-12', 'started', 'completer', 'assigned', 'in_progress', NULL, datetime('now', '-10 days'));

INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
VALUES ('h-seed-12d', 't-seed-12', 'completed', 'completer', 'in_progress', 'completed', NULL, datetime('now', '-7 days'));
```

---

## 执行后验证

```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

SELECT 'tickets' AS tbl, COUNT(*) AS cnt FROM tickets
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'ticket_history', COUNT(*) FROM ticket_history;

SELECT status, COUNT(*) AS cnt FROM tickets GROUP BY status ORDER BY cnt DESC;
```

预期结果：
- 3 张表（tickets, users, ticket_history）
- tickets: 12+ 行（含已有工单）
- users: 5 行
- ticket_history: 36+ 行（含回填 + 种子数据）
- 状态分布：submitted≥3, assigned≥3, in_progress≥2, completed≥4
