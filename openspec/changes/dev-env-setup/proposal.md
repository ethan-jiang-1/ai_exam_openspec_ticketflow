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
- 配置前后端开发代理和 CORS
- 配置环境变量管理

## Capabilities

### New Capabilities

- project-structure: pnpm monorepo 项目结构，包含前端、后端、共享类型三个工作区
- frontend-env: React + Vite 前端开发环境，包含开发服务器、构建配置、API 代理
- backend-env: Hono + Drizzle + SQLite 后端开发环境，包含 API 服务器、数据库连接、ORM 配置、CORS 中间件
- shared-types: 共享类型定义包，前后端共用的 TypeScript 类型
- dev-tooling: 代码规范（ESLint + Prettier）、测试（Vitest）、开发脚本、环境变量管理等工具链配置

### Modified Capabilities

## Impact

- 项目根目录：新增 `package.json`、`pnpm-workspace.yaml`、`tsconfig.base.json`、`.gitignore`、`.env.example`、`.npmrc`、ESLint/Prettier 配置文件
- `apps/web`：新增前端应用，包含 `vite.config.ts`（含 API 代理配置）、`tsconfig.json`、基础 React 组件、入口文件
- `apps/server`：新增后端应用，包含 Hono 入口（含 CORS 中间件）、`drizzle.config.ts`、数据库连接、`src/db/index.ts`
- `packages/shared`：新增共享类型包，包含 `package.json`、`tsconfig.json`、类型导出入口 `src/index.ts`
- 依赖：引入 React 18、Hono、Drizzle ORM、better-sqlite3、Vite 5、Vitest、ESLint、Prettier、concurrently、dotenv 等

## Success Criteria

- `pnpm install` 成功安装所有依赖，workspace:* 引用正常解析
- `pnpm dev` 同时启动前端（端口 5173）和后端（端口 3000）开发服务器，前端可通过代理访问后端 API
- `pnpm build` 成功构建所有工作区，产物分别在 `apps/web/dist`（Vite 产物）和 `apps/server/dist`（tsup 产物 `index.js`）
- `pnpm test` 运行所有测试并通过（至少包含 /health 端点测试和 shared 类型导出测试）
- `pnpm lint` 无报错
- `GET /health` 返回 `{ "status": "ok" }` 和 200 状态码
- 前后端均可 `import` from `@ticketflow/shared` 且 TypeScript 编译无错误
- SQLite 数据库文件在 `.gitignore` 中被忽略
