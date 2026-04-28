## Context

change ① 已在 `packages/shared` 中定义了 `Ticket`、`TicketStatus`、`Role` 类型。本 change 在 `apps/server` 中落地数据库表和 REST API。当前 `apps/server/src/db/schema.ts` 为空，`drizzle.config.ts` 已配置好 SQLite dialect。

## Goals / Non-Goals

**Goals:**
- 定义 tickets 表的 Drizzle schema，字段与 `packages/shared` 的 `Ticket` interface 对齐
- 提供 REST API：`GET /api/tickets`、`GET /api/tickets/:id`、`POST /api/tickets`
- 提供状态流转 API：`PATCH /api/tickets/:id/assign`、`PATCH /api/tickets/:id/start`、`PATCH /api/tickets/:id/complete`
- 状态流转有合法性校验（不能跳步、不能倒退）

**Non-Goals:**
- 不做分页（Demo 阶段数据量小，`GET /api/tickets` 返回全部）
- 不做权限控制（无真实登录，任何人可调用所有端点）
- 不做 WebSocket / 实时更新
- 不引入新依赖（drizzle-orm / better-sqlite3 / hono 已存在）

## Decisions

### D1: Drizzle schema 字段与 Ticket interface 对齐

tickets 表 DB 列名使用 snake_case（`created_by`, `assigned_to`, `created_at`, `updated_at`），通过 Drizzle `text('created_by')` 映射到 JS 侧 camelCase 属性名（`createdBy`），与 `Ticket` interface 对齐。所有列均使用 `text` 类型。

`id` 不使用自增 integer，而由应用层通过 `crypto.randomUUID()` 生成 UUID v4 字符串（Node 16.7+ 可用，项目要求 18+）。

**理由**: DB 列名遵循 SQL 惯例（snake_case），JS 侧遵循 TypeScript 惯例（camelCase），Drizzle 桥接两者。`text` 类型映射到 JS `string`，与 TypeScript 类型天然对齐。

### D2: 状态流转为独立 PATCH 端点

不做单一 `PATCH /api/tickets/:id`，而是拆成三个专用端点：`/assign`、`/start`、`/complete`。每个端点只接受必要参数（如 assign 接受 `assignedTo`），并在服务端校验前置状态。

合法流转：
```
submitted → assigned → in_progress → completed
```

非法流转返回 `400 Bad Request`。

**理由**: 专用端点语义清晰，前端不需要知道状态机细节。单一 PATCH 端点会让客户端自行判断"这个状态变更是合法的吗"，容易出错。

### D3: db 层抽象 — Drizzle instance 集中创建

在 `apps/server/src/db/index.ts` 中创建 Drizzle instance 并导出，路由层通过 `import { db } from '../db'` 使用。路由层不直接接触 `better-sqlite3` 或 SQLite API。

**理由**: 满足全局 config 的数据库可移植约束。换库时只需改 `db/index.ts`（驱动 + Drizzle adapter）和 `package.json`。

### D4: 配置管理

本 change 不引入新环境变量。复用现有 `DATABASE_PATH`。API 端口复用 `SERVER_PORT`（默认 3000）。

### D5: 开发代理策略

本 change 不涉及前端开发代理的变更。Vite dev proxy 配置留给 change ③。当前 API 可通过 `http://localhost:3000/api/tickets` 直接访问。

### D6: 迁移策略

使用 `drizzle-kit push`（开发阶段直接 push schema 到 SQLite 文件）。不生成 SQL migration 文件 — Demo 阶段不需要版本化迁移。

### D7: 测试数据库策略

API 测试使用 `app.request()` 直接调 Hono（不走 HTTP server，复用现有测试模式）。每个测试文件通过 `beforeEach` 使用 Drizzle API（`db.delete(tickets)`）清空 tickets 表，测试之间互不污染。测试复用开发数据库 `./data/ticketflow.db`，不额外引入内存数据库（保持 db/index.ts 导出单一性）。

**理由**: 引入内存 DB 需要改 db/index.ts 的导出方式（工厂函数），增加抽象层。Demo 阶段 Drizzle `db.delete()` 足够简单且保持可移植性（不写原始 SQL）。MVP 阶段可改用独立测试 DB 或工厂模式。

### D8: 错误响应格式

所有 API 错误响应统一格式：`{ error: string }`。与 `app.ts` 全局错误处理器的 `{ error, code }` 保持一致原则，但业务层校验错误（如 title 为空、非法状态）只返回 `error` 字段即可，`code` 字段留给全局异常。

**理由**: 统一格式让前端（change ③）可以用同一套错误处理逻辑。

## Directory Layout

```
apps/server/src/
├── app.ts                    # 修改：挂载 tickets 路由
├── db/
│   ├── index.ts              # 修改：创建并导出 Drizzle instance
│   └── schema.ts             # 修改：定义 tickets 表
├── routes/
│   ├── health.ts             # 不变
│   └── tickets.ts            # 新增：tickets CRUD + 状态流转 API
└── __tests__/
    └── tickets.test.ts       # 新增：API 集成测试
```

## API Endpoints

| Method | Path | 描述 | Request Body | 成功响应 |
|--------|------|------|-------------|---------|
| GET | `/api/tickets` | 列出所有工单 | — | `200 [{Ticket}]` |
| GET | `/api/tickets/:id` | 获取单个工单 | — | `200 {Ticket}` / `404` |
| POST | `/api/tickets` | 创建工单 | `{title, description, createdBy}` | `201 {Ticket}` |
| PATCH | `/api/tickets/:id/assign` | 指派 | `{assignedTo}` | `200 {Ticket}` |
| PATCH | `/api/tickets/:id/start` | 开始处理 | — | `200 {Ticket}` |
| PATCH | `/api/tickets/:id/complete` | 完成 | — | `200 {Ticket}` |

## Risks / Trade-offs

- **[Risk] UUID 在 SQLite 中无索引优化** → Demo 数据量可忽略。MVP 阶段可加索引
- **[Risk] 无分页，数据量大时性能问题** → Demo 阶段数据量极小，MVP 再加分页
- **[Risk] `drizzle-kit push` 不适合生产** → Demo 阶段足够，生产应改用 `drizzle-kit generate` + `migrate`

## Open Questions

1. **POST /api/tickets 是否需要校验 `title` 非空？** — 假设需要（至少 `title` 为必填），`description` 可选（空字符串兜底）。
2. **`assignedTo` 字段是否需要校验用户存在？** — 假设不需要（Demo 阶段无用户表，任意字符串均可）。
