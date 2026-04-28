# shared-types Specification

## Purpose
TBD - created by archiving change dev-env-setup. Update Purpose after archive.
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

