# shared-types Specification

## Purpose
前后端共享类型规范：@ticketflow/shared 包的类型定义、运行时常量导出与工作区引用机制。
## Requirements
### Requirement: ST-001 共享类型定义包

`packages/shared` SHALL 是一个 TypeScript 包，导出前后端共用的类型定义，包名为 `@ticketflow/shared`。

#### Scenario: 前端引用共享类型

- **WHEN** `apps/web/src/App.tsx` 中执行 `import type { AppInfo } from '@ticketflow/shared'`
- **THEN** `npx tsc --noEmit`（在 apps/web 目录）SHALL 退出码为 0，AppInfo 类型可正常使用

#### Scenario: 后端引用共享类型

- **WHEN** `apps/server/src/index.ts` 中执行 `import type { AppInfo } from '@ticketflow/shared'`
- **THEN** `npx tsc --noEmit`（在 apps/server 目录）SHALL 退出码为 0，AppInfo 类型可正常使用

### Requirement: ST-002 共享包构建配置

`packages/shared` SHALL 配置为可被其他工作区直接引用（通过 TypeScript paths 或 workspace 协议），无需预构建步骤。

#### Scenario: 修改共享类型后立即生效

- **WHEN** 在 `packages/shared/src/index.ts` 中新增一个导出类型
- **THEN** 前端和后端 SHALL 在下次 TypeScript 检查（`tsc --noEmit`）时自动识别新增类型，无需手动构建共享包

### Requirement: ST-003 初始类型定义

`packages/shared/src/index.ts` SHALL 导出一个 `AppInfo` interface 和一个 `APP_INFO` 运行时常量，包含项目元信息。

#### Scenario: AppInfo 类型可用

- **WHEN** 从 `@ticketflow/shared` 导入 `AppInfo`
- **THEN** `AppInfo` SHALL 是一个包含 `name: string` 和 `version: string` 字段的 TypeScript interface

#### Scenario: APP_INFO 运行时常量可验证

- **WHEN** 从 `@ticketflow/shared` 导入 `APP_INFO`
- **THEN** `APP_INFO` SHALL 是一个包含 `name: "ticketflow"` 和 `version: "0.1.0"` 字段的 `const` 对象，类型为 `AppInfo`（通过 `as const` 满足类型约束）

### Requirement: ST-004 Role 角色类型定义

`packages/shared` SHALL 导出 `Role` 联合类型（值为 `"submitter" | "dispatcher" | "completer"`）、`ROLES` 运行时常量对象和 `ROLE_LIST` 常量数组。

#### Scenario: Role 类型可被前后端引用

- **WHEN** `apps/web` 或 `apps/server` 中执行 `import type { Role } from '@ticketflow/shared'`
- **THEN** TypeScript 编译 SHALL 通过，且 `Role` 类型接受 `"submitter"`、`"dispatcher"`、`"completer"` 三个字符串字面量

#### Scenario: ROLES 常量包含所有角色值

- **WHEN** 从 `@ticketflow/shared` 导入 `ROLES`
- **THEN** `ROLES` SHALL 是一个包含 `submitter: "submitter"`、`dispatcher: "dispatcher"`、`completer: "completer"` 键值对的 `const` 对象（键名与值一致）

#### Scenario: ROLE_LIST 提供可遍历数组

- **WHEN** 从 `@ticketflow/shared` 导入 `ROLE_LIST`
- **THEN** `ROLE_LIST` SHALL 是一个 `readonly ["submitter", "dispatcher", "completer"]` 数组，可通过 `for...of` 遍历所有角色值

### Requirement: ST-005 TicketStatus 工单状态类型定义

`packages/shared` SHALL 导出 `TicketStatus` 联合类型（值为 `"submitted" | "assigned" | "in_progress" | "completed"`）、`TICKET_STATUSES` 运行时常量对象和 `TICKET_STATUS_LIST` 常量数组。

#### Scenario: TicketStatus 类型可被前后端引用

- **WHEN** `apps/web` 或 `apps/server` 中执行 `import type { TicketStatus } from '@ticketflow/shared'`
- **THEN** TypeScript 编译 SHALL 通过，且 `TicketStatus` 类型接受 `"submitted"`、`"assigned"`、`"in_progress"`、`"completed"` 四个字符串字面量

#### Scenario: TICKET_STATUSES 常量包含所有状态值

- **WHEN** 从 `@ticketflow/shared` 导入 `TICKET_STATUSES`
- **THEN** `TICKET_STATUSES` SHALL 是一个包含 `submitted: "submitted"`、`assigned: "assigned"`、`in_progress: "in_progress"`、`completed: "completed"` 键值对的 `const` 对象（键名与值保持 snake_case 一致）

#### Scenario: TICKET_STATUS_LIST 提供可遍历数组

- **WHEN** 从 `@ticketflow/shared` 导入 `TICKET_STATUS_LIST`
- **THEN** `TICKET_STATUS_LIST` SHALL 是一个 `readonly ["submitted", "assigned", "in_progress", "completed"]` 数组，可通过 `for...of` 遍历所有状态值

### Requirement: ST-006 Ticket 工单类型定义

`packages/shared` SHALL 导出 `Ticket` interface，包含 `id: string`、`title: string`、`description: string`、`status: TicketStatus`、`createdBy: string`、`assignedTo: string | null`、`createdAt: string`、`updatedAt: string` 字段。

#### Scenario: Ticket 类型可被前后端引用

- **WHEN** `apps/web` 或 `apps/server` 中执行 `import type { Ticket } from '@ticketflow/shared'`
- **THEN** TypeScript 编译 SHALL 通过，且 `Ticket` 类型要求包含上述所有字段，其中 `assignedTo` 允许 `null`

#### Scenario: Ticket 类型与 TicketStatus 关联

- **WHEN** 构造一个 `Ticket` 类型的对象，且 `status` 字段赋值为 `"unknown_status"`
- **THEN** TypeScript 编译 SHALL 报错，因为 `"unknown_status"` 不是合法的 `TicketStatus`

