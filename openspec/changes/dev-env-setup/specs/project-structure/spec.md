## ADDED Requirements

### Requirement: Monorepo 工作区结构

项目 SHALL 使用 pnpm workspaces 管理 monorepo，包含以下三个工作区：
- `apps/web`：前端应用
- `apps/server`：后端 API 服务
- `packages/shared`：共享类型定义

#### Scenario: pnpm install 安装所有工作区依赖

- **WHEN** 在项目根目录执行 `pnpm install`
- **THEN** 所有三个工作区的依赖 SHALL 被正确安装，且 `packages/shared` 可通过 `workspace:*` 协议被前后端引用

#### Scenario: 工作区之间引用共享包

- **WHEN** `apps/web` 或 `apps/server` 在 package.json 中声明 `"@ticketflow/shared": "workspace:*"`
- **THEN** 该包 SHALL 可以直接 import 共享类型，无需发布到 registry

### Requirement: 根目录配置文件

项目根目录 SHALL 包含以下配置文件：
- `package.json`：定义全局 scripts（dev、build、test、lint）
- `pnpm-workspace.yaml`：声明工作区路径
- `tsconfig.base.json`：共享 TypeScript 配置，各工作区继承并扩展

#### Scenario: 根目录 scripts 驱动所有工作区

- **WHEN** 在根目录执行 `pnpm dev`
- **THEN** 前端和后端开发服务器 SHALL 同时启动
