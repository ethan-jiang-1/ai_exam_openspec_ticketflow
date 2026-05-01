# packages/

## shared/

`@ticketflow/shared` — 前后端共享的 TypeScript 类型与常量。

| 文件 | 内容 |
|------|------|
| `src/ticket-types.ts` | Role, TicketStatus, Priority, Ticket, User 等类型 + 标签/颜色常量 |
| `src/dashboard-types.ts` | Dashboard API 响应类型定义 |
| `src/index.ts` | 统一导出 |

前后端通过 `workspace:*` 依赖。
