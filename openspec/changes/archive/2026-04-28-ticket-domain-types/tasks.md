## 1. 创建工单领域类型文件

- [x] 1.1 创建 `packages/shared/src/ticket-types.ts`，定义 `ROLES` 常量（键名=值）、`Role` 类型、`ROLE_LIST` 数组 [ST-004]
- [x] 1.2 在同一文件中定义 `TICKET_STATUSES` 常量（键名=值，统一 snake_case）、`TicketStatus` 类型、`TICKET_STATUS_LIST` 数组 [ST-005]
- [x] 1.3 在同一文件中定义 `Ticket` interface（id / title / description / status / createdBy / assignedTo / createdAt / updatedAt） [ST-006]

## 2. 导出与集成

- [x] 2.1 在 `packages/shared/src/index.ts` 中 re-export `ticket-types.ts` 的所有导出 [ST-004] [ST-005] [ST-006]

## 3. 测试

- [x] 3.1 创建 `packages/shared/src/__tests__/ticket-types.test.ts` [ST-004] [ST-005] [ST-006]
  - 验证 `ROLES` 对象包含三个角色值，键名与值一致
  - 验证 `ROLE_LIST` 数组长度为 3 且元素类型正确
  - 验证 `TICKET_STATUSES` 对象包含四个状态值，`in_progress` 键名为 snake_case
  - 验证 `TICKET_STATUS_LIST` 数组长度为 4 且元素类型正确
  - 验证 `Ticket` 类型包含所有必需字段，`assignedTo` 允许 null
  - 验证非法 `status` 值被 TypeScript 拒绝（通过 `as const` 断言或 expect-type 工具）

## 4. 验证

- [x] 4.1 在 `apps/web` 和 `apps/server` 中各创建一个临时 import 验证文件，确认 `Role`、`TicketStatus`、`Ticket` 类型可正常导入且 `tsc --noEmit` 通过 [ST-004 Scenario 1] [ST-005 Scenario 1] [ST-006 Scenario 1]
- [x] 4.2 运行 `pnpm check`（build + test + lint）确认全部通过
