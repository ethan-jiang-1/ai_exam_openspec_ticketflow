## Why

TicketFlow 是一个工单流程处理工具，聚焦工单的多人处理链，面向终端使用者。在开始业务功能开发之前，需要先搭建完整的项目基础建设和开发环境，确保团队有一个统一、高效、可扩展的 TypeScript 全栈开发体验。

## What Changes

- 建立 pnpm monorepo 项目结构（apps/web、apps/server、packages/shared）
- 配置 TypeScript 全栈开发环境（共享 tsconfig、路径别名）
- 搭建前端开发环境（React + Vite）
- 搭建后端开发环境（Hono + Drizzle + SQLite）
- 配置代码规范工具（ESLint + Prettier）
- 配置测试框架（Vitest）
- 定义共享类型包（packages/shared）
- 配置开发脚本（dev、build、test、lint）

## Capabilities

### New Capabilities

- project-structure: pnpm monorepo 项目结构，包含前端、后端、共享类型三个工作区
- frontend-env: React + Vite 前端开发环境，包含开发服务器、构建配置
- backend-env: Hono + Drizzle + SQLite 后端开发环境，包含 API 服务器、数据库连接、ORM 配置
- shared-types: 共享类型定义包，前后端共用的 TypeScript 类型
- dev-tooling: 代码规范（ESLint + Prettier）、测试（Vitest）、开发脚本等工具链配置

### Modified Capabilities

## Impact

- 项目根目录：新增 package.json、pnpm-workspace.yaml、tsconfig.base.json 等配置文件
- apps/web：新增前端应用完整脚手架
- apps/server：新增后端应用完整脚手架
- packages/shared：新增共享类型包
- 依赖：引入 React、Hono、Drizzle、Vite、Vitest、ESLint、Prettier 等依赖
