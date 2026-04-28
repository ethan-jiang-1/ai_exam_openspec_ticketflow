# project-structure Specification

## Purpose
TBD - created by archiving change dev-env-setup. Update Purpose after archive.
## Requirements
### Requirement: PS-001 Monorepo 工作区结构

项目 SHALL 使用 pnpm workspaces 管理 monorepo，包含以下三个工作区：
- `apps/web`：前端应用
- `apps/server`：后端 API 服务
- `packages/shared`：共享类型定义

#### Scenario: pnpm install 安装所有工作区依赖

- **WHEN** 在项目根目录执行 `pnpm install`
- **THEN** 所有三个工作区的依赖 SHALL 被正确安装，`pnpm-lock.yaml` 生成在根目录，且 `packages/shared` 可通过 `workspace:*` 协议被前后端引用

#### Scenario: 工作区之间引用共享包

- **WHEN** `apps/web` 或 `apps/server` 在 package.json 中声明 `"@ticketflow/shared": "workspace:*"`
- **THEN** 该包 SHALL 可以直接 `import` 共享类型，无需发布到 registry

### Requirement: PS-002 根目录配置文件

项目根目录 SHALL 包含以下配置文件：
- `package.json`：定义全局 scripts（dev、build、test、lint、format）
- `pnpm-workspace.yaml`：声明工作区路径 `apps/*` 和 `packages/*`
- `tsconfig.base.json`：共享 TypeScript 配置（strict: true, target: ESNext, moduleResolution: bundler），各工作区继承并扩展
- `.gitignore`：忽略 `node_modules/`、`dist/`、`*.db`、`*.db-journal`、`*.db-wal`、`.env`、`.env.local`、`coverage/`
- `.env.example`：环境变量模板，列出 SERVER_PORT、DATABASE_PATH、VITE_PORT 及默认值

#### Scenario: 根目录 scripts 驱动所有工作区

- **WHEN** 在根目录执行 `pnpm dev`
- **THEN** 前端（端口 5173）和后端（端口 3000）开发服务器 SHALL 通过 concurrently 同时启动

#### Scenario: 根目录 scripts 构建所有工作区

- **WHEN** 在根目录执行 `pnpm build`
- **THEN** 所有工作区 SHALL 按依赖顺序构建：先 `packages/shared`，再 `apps/server` 和 `apps/web`

### Requirement: PS-003 环境变量管理

项目 SHALL 使用 `.env` 文件管理配置，`.env.example` 提交到仓库作为模板，`.env` 被 `.gitignore` 忽略。

#### Scenario: 从模板创建环境配置

- **WHEN** 开发者执行 `cp .env.example .env`
- **THEN** 应用 SHALL 使用 `.env` 中的配置值，未设置的变量使用默认值（SERVER_PORT=3000, DATABASE_PATH=./data/ticketflow.db）。所有路径变量 SHALL 相对于项目根目录解析

#### Scenario: 后端读取数据库路径配置

- **WHEN** `apps/server` 启动时
- **THEN** SHALL 从 `DATABASE_PATH` 环境变量读取 SQLite 数据库文件路径，默认值为 `./data/ticketflow.db`，数据库文件所在目录不存在时 SHALL 自动创建

