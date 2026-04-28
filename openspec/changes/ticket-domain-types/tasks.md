## 1. 创建工单领域类型文件

- [ ] 1.1 创建 `packages/shared/src/ticket-types.ts`，定义 `ROLES` 常量、`Role` 类型、`TICKET_STATUSES` 常量、`TicketStatus` 类型、`Ticket` interface [ST-004] [ST-005] [ST-006]

## 2. 导出与集成

- [ ] 2.1 在 `packages/shared/src/index.ts` 中 re-export `ticket-types.ts` 的所有导出 [ST-004] [ST-005] [ST-006]

## 3. 测试

- [ ] 3.1 创建 `packages/shared/src/__tests__/ticket-types.test.ts`，验证 Role 类型约束、TicketStatus 类型约束、Ticket 字段完整性、非法值被拒绝 [ST-004] [ST-005] [ST-006]

## 4. 验证

- [ ] 4.1 运行 `pnpm check`（build + test + lint）确认全部通过 [ST-004] [ST-005] [ST-006]
