## ADDED Requirements

### Requirement: 共享类型定义包

`packages/shared` SHALL 是一个 TypeScript 包，导出前后端共用的类型定义，包名为 `@ticketflow/shared`。

#### Scenario: 前端引用共享类型

- **WHEN** `apps/web` 中 `import type { Ticket } from '@ticketflow/shared'`
- **THEN** TypeScript SHALL 正确解析类型，无编译错误

#### Scenario: 后端引用共享类型

- **WHEN** `apps/server` 中 `import type { Ticket } from '@ticketflow/shared'`
- **THEN** TypeScript SHALL 正确解析类型，无编译错误

### Requirement: 共享包构建配置

`packages/shared` SHALL 配置为可被其他工作区直接引用（通过 TypeScript paths 或 workspace 协议），无需预构建步骤。

#### Scenario: 修改共享类型后立即生效

- **WHEN** 修改 `packages/shared` 中的类型定义
- **THEN** 前端和后端 SHALL 在下次 TypeScript 检查时自动识别变更，无需手动构建共享包
