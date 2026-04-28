## ADDED Requirements

### Requirement: ST-004 Role 角色类型定义

`packages/shared` SHALL 导出 `Role` 联合类型（值为 `"submitter" | "dispatcher" | "completer"`）和 `ROLES` 运行时常量对象。

#### Scenario: Role 类型可被前后端引用

- **WHEN** `apps/web` 或 `apps/server` 中执行 `import type { Role } from '@ticketflow/shared'`
- **THEN** TypeScript 编译 SHALL 通过，且 `Role` 类型接受 `"submitter"`、`"dispatcher"`、`"completer"` 三个字符串字面量

#### Scenario: ROLES 常量包含所有角色值

- **WHEN** 从 `@ticketflow/shared` 导入 `ROLES`
- **THEN** `ROLES` SHALL 是一个包含 `submitter: "submitter"`、`dispatcher: "dispatcher"`、`completer: "completer"` 键值对的 `const` 对象

### Requirement: ST-005 TicketStatus 工单状态类型定义

`packages/shared` SHALL 导出 `TicketStatus` 联合类型（值为 `"submitted" | "assigned" | "in_progress" | "completed"`）和 `TICKET_STATUSES` 运行时常量对象。

#### Scenario: TicketStatus 类型可被前后端引用

- **WHEN** `apps/web` 或 `apps/server` 中执行 `import type { TicketStatus } from '@ticketflow/shared'`
- **THEN** TypeScript 编译 SHALL 通过，且 `TicketStatus` 类型接受 `"submitted"`、`"assigned"`、`"in_progress"`、`"completed"` 四个字符串字面量

#### Scenario: TICKET_STATUSES 常量包含所有状态值

- **WHEN** 从 `@ticketflow/shared` 导入 `TICKET_STATUSES`
- **THEN** `TICKET_STATUSES` SHALL 是一个包含 `submitted: "submitted"`、`assigned: "assigned"`、`inProgress: "in_progress"`、`completed: "completed"` 键值对的 `const` 对象

### Requirement: ST-006 Ticket 工单类型定义

`packages/shared` SHALL 导出 `Ticket` interface，包含 `id: string`、`title: string`、`description: string`、`status: TicketStatus`、`createdBy: string`、`assignedTo: string | null`、`createdAt: string`、`updatedAt: string` 字段。

#### Scenario: Ticket 类型可被前后端引用

- **WHEN** `apps/web` 或 `apps/server` 中执行 `import type { Ticket } from '@ticketflow/shared'`
- **THEN** TypeScript 编译 SHALL 通过，且 `Ticket` 类型要求包含上述所有字段，其中 `assignedTo` 允许 `null`

#### Scenario: Ticket 类型与 TicketStatus 关联

- **WHEN** 构造一个 `Ticket` 类型的对象，且 `status` 字段赋值为 `"unknown_status"`
- **THEN** TypeScript 编译 SHALL 报错，因为 `"unknown_status"` 不是合法的 `TicketStatus`
