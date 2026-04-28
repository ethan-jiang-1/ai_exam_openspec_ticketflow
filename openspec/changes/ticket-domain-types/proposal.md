## Why

后续 change ②（建表 + API）和 ③（前端 UI）都需要统一的角色、状态、工单类型定义。先在 `packages/shared` 中落地这些类型，避免前后端各自定义导致不一致。

## What Changes

- 在 `packages/shared/src/` 新增工单领域类型：`Role`、`TicketStatus`、`Ticket` 及相关常量
- 从 `index.ts` 统一导出，前后端通过 `@ticketflow/shared` 引用

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `shared-types`: 在现有共享类型包中新增工单领域类型（Role / TicketStatus / Ticket）及对应运行时常量

## Impact

- `packages/shared/src/index.ts` — 新增类型导出
- `packages/shared/src/__tests__/` — 新增类型测试文件
- `openspec/specs/shared-types/spec.md` — 新增 ST-004 ~ ST-006 requirements

## Success Criteria

- `pnpm check`（build + test + lint）全部通过
- `apps/web` 和 `apps/server` 均可 `import type { Role, TicketStatus, Ticket } from '@ticketflow/shared'`，TypeScript 编译无报错
