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

tickets 表字段名和类型严格对应 `Ticket` interface：`id` (text, PK)、`title` (text)、`description` (text)、`status` (text)、`createdBy` (text)、`assignedTo` (text, nullable)、`createdAt` (text, ISO 8601)、`updatedAt` (text, ISO 8601)。

`id` 不使用自增 integer，而由应用层生成 UUID v4 字符串，保持与 `Ticket.id: string` 一致。

**理由**: 避免应用层类型和数据库列之间的阻抗失配。`drizzle-orm/sqlite-core` 的 `text` 类型映射到 JS `string`，与 TypeScript 类型天然对齐。

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
