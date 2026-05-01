# apps/

## server/

Hono API 服务，端口 3000。Drizzle ORM + SQLite（better-sqlite3，WAL 模式）。

关键文件：

| 文件 | 作用 |
|------|------|
| `server/src/index.ts` | 入口，启动 HTTP server + 自动 migration |
| `server/src/app.ts` | Hono app 组装，挂载中间件和路由 |
| `server/src/db/schema.ts` | Drizzle schema：tickets / users / ticket_history |
| `server/src/db/seed.ts` | 种子数据 |

### API 端点

所有接口 JSON，除 `/health` 和 login 外均需登录（Cookie session）。

```
GET    /health
POST   /api/auth/login       登录
POST   /api/auth/logout      登出
GET    /api/auth/me          当前用户
GET    /api/tickets          工单列表
POST   /api/tickets          创建工单（需 ticket:create）
GET    /api/tickets/:id      工单详情
GET    /api/tickets/:id/history   操作时间线
PATCH  /api/tickets/:id      编辑（仅提交者，submitted 状态）
PATCH  /api/tickets/:id/assign    指派/重新指派（需 ticket:assign）
PATCH  /api/tickets/:id/start     开始处理（需 ticket:start）
PATCH  /api/tickets/:id/complete  完成（需 ticket:complete）
POST   /api/tickets/:id/comments  添加备注
GET    /api/admin/users       用户列表（需 user:manage）
POST   /api/admin/users       创建用户
PATCH  /api/admin/users/:username  编辑用户
DELETE /api/admin/users/:username  删除用户
GET    /api/dashboard         数据面板（admin/dispatcher）
```

状态流转：`submitted → assigned → in_progress → completed`，dispatcher 可重新指派。

角色权限：submitter（create/read），dispatcher（assign/read），completer（start/complete/read），admin（全部 + user:manage）。

## web/

React 前端，端口 5173。Vite + antd 6 + React Router 7。Vite proxy `/api` → `:3000`。

路由：

| 路径 | 页面 | 角色 |
|------|------|------|
| `/login` | 登录页（表单式） | 所有人 |
| `/login-dev` | 开发登录页（选用户即登录） | 所有人 |
| `/workbench/submitter` | 提交者工作台 | submitter |
| `/workbench/dispatcher` | 调度者工作台 | dispatcher |
| `/workbench/completer` | 完成者工作台 | completer |
| `/workbench/admin` | 管理员工作台（用户 CRUD） | admin |
| `/dashboard` | 数据面板 | admin, dispatcher |

路由守卫：未登录跳转 `/login`，跨角色工作台自动重定向。
