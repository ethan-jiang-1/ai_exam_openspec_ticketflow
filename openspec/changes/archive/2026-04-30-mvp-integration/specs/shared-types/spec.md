## MODIFIED Requirements

### Requirement: ST-004 Role 角色类型定义

`packages/shared` SHALL 导出 `Role` 联合类型（值为 `"submitter" | "dispatcher" | "completer" | "admin"`）、`ROLES` 运行时常量对象和 `ROLE_LIST` 常量数组。

#### Scenario: Role 类型可被前后端引用

- **WHEN** `apps/web` 或 `apps/server` 中执行 `import type { Role } from '@ticketflow/shared'`
- **THEN** TypeScript 编译 SHALL 通过，且 `Role` 类型接受 `"submitter"`、`"dispatcher"`、`"completer"`、`"admin"` 四个字符串字面量

#### Scenario: ROLES 常量包含所有角色值

- **WHEN** 从 `@ticketflow/shared` 导入 `ROLES`
- **THEN** `ROLES` SHALL 是一个包含 `submitter: "submitter"`、`dispatcher: "dispatcher"`、`completer: "completer"`、`admin: "admin"` 键值对的 `const` 对象（键名与值一致）

#### Scenario: ROLE_LIST 提供可遍历数组

- **WHEN** 从 `@ticketflow/shared` 导入 `ROLE_LIST`
- **THEN** `ROLE_LIST` SHALL 是一个 `readonly ["submitter", "dispatcher", "completer", "admin"]` 数组，长度为 4，可通过 `for...of` 遍历所有角色值
