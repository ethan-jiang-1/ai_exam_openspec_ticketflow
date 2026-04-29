# dev-tooling Specification

## Purpose
TBD - created by archiving change dev-env-setup. Update Purpose after archive.
## Requirements
### Requirement: DT-001 ESLint 代码检查

项目 SHALL 配置 ESLint flat config（`eslint.config.js`），使用 typescript-eslint 插件，支持所有三个工作区的 TypeScript 代码检查。

#### Scenario: 执行代码检查

- **WHEN** 在根目录执行 `pnpm lint`
- **THEN** ESLint SHALL 检查 `apps/web/src/`、`apps/server/src/`、`packages/shared/src/` 下的所有 `.ts`/`.tsx` 文件，退出码为 0

#### Scenario: 有问题的代码被检出

- **WHEN** 在任意工作区的 TypeScript 文件中写入 `const x: any = 1`（触发 no-explicit-any 规则）
- **THEN** `pnpm lint` SHALL 报告该问题且退出码非 0

### Requirement: DT-002 Prettier 代码格式化

项目 SHALL 配置 Prettier（`prettier.config.js`），统一所有工作区的代码格式。

#### Scenario: 执行代码格式化

- **WHEN** 在根目录执行 `pnpm format`
- **THEN** Prettier SHALL 格式化所有工作区的 `.ts`、`.tsx`、`.json` 文件

### Requirement: DT-003 Vitest 测试框架

项目 SHALL 配置 Vitest 测试框架，`apps/web`、`apps/server` 和 `packages/shared` 各自有独立的 `vitest.config.ts`。

#### Scenario: 运行所有测试

- **WHEN** 在根目录执行 `pnpm test`
- **THEN** Vitest SHALL 运行 `apps/web`、`apps/server` 和 `packages/shared` 的所有测试用例，输出通过/失败计数，退出码反映测试结果

#### Scenario: 单个工作区运行测试

- **WHEN** 在 `apps/server` 目录执行 `pnpm test`
- **THEN** 仅运行 `apps/server/vitest.config.ts` 中配置的测试文件

#### Scenario: health 端点测试通过

- **WHEN** 执行 `apps/server` 的测试
- **THEN** SHALL 包含一个测试用例验证 `GET /health` 返回 `{ "status": "ok" }` 和 200 状态码

#### Scenario: shared 类型导出测试通过

- **WHEN** 执行 `packages/shared` 的测试
- **THEN** SHALL 包含一个测试用例验证 `import { APP_INFO } from '../index'` 成功且 `APP_INFO.name` 为 `"ticketflow"`、`APP_INFO.version` 为 `"0.1.0"`

### Requirement: DT-004 统一开发脚本

项目根目录 `package.json` SHALL 定义以下 scripts：
- `dev`：通过 concurrently 同时启动前端和后端开发服务器
- `build`：按依赖顺序构建所有工作区
- `test`：运行所有工作区测试
- `lint`：执行 ESLint 检查
- `format`：执行 Prettier 格式化

#### Scenario: 全局开发脚本可用

- **WHEN** 开发者在项目根目录执行 `pnpm <script>`（script 为上述任一脚本名）
- **THEN** 对应脚本 SHALL 正确执行，退出码为 0（lint 和 test 要求代码无问题）

### Requirement: DT-005 Workspace 显式 TypeScript 依赖

每个包含 `tsc` 调用构建步骤的 workspace SHALL 在其 `package.json` 的 `devDependencies` 中显式声明 `typescript` 依赖，确保在隔离构建环境中 `tsc` 命令可用。当前涉及 `packages/shared` 和 `apps/web`。

#### Scenario: Cloudflare Pages 构建成功
- **WHEN** Cloudflare Pages 执行 `pnpm run build`
- **THEN** `packages/shared` 的 `tsc --noEmit` 步骤 SHALL 成功执行，不报 `tsc: not found`

#### Scenario: 本地构建不受影响
- **WHEN** 在本地执行 `pnpm run build`
- **THEN** 所有 workspace 构建 SHALL 与变更前行为一致，退出码为 0

### Requirement: DT-006 packageManager 字段声明

根 `package.json` SHALL 声明 `packageManager` 字段，值为 `pnpm@10.27.0`，确保构建平台使用正确的包管理器版本。

#### Scenario: Cloudflare 识别 pnpm 版本
- **WHEN** Cloudflare Pages 初始化构建环境
- **THEN** SHALL 使用 `packageManager` 字段指定的 pnpm 版本执行依赖安装

### Requirement: DT-007 Wrangler 静态资产部署配置

仓库根目录 SHALL 包含 `wrangler.jsonc` 文件，声明 Workers + D1 + 静态资产一体化部署配置，使 `npx wrangler deploy` 能在 monorepo 根目录成功执行，将后端 API 和前端构建产物部署为单一 Worker。

文件 SHALL 包含以下配置项：
- `name`: `"ticketflow"`
- `compatibility_date`: `"2026-04-29"`
- `main`: `"./apps/server/src/worker.ts"`（Workers 入口，导入 Hono app 并注入 D1 binding）
- `assets.directory`: `"./apps/web/dist"`（Vite 构建产物）
- `assets.not_found_handling`: `"single-page-application"`（支持 React Router 客户端路由）
- `assets.run_worker_first`: `["/api/*", "/health"]`（API 路径由 Worker 处理，其余走静态资产）
- `d1_databases`: 包含一个绑定，`binding` 为 `"DB"`，`database_name` 为 `"ticketflow-db"`，`database_id` 为有效的 D1 数据库 UUID，`migrations_dir` 为 `"apps/server/drizzle"`

#### Scenario: Wrangler 配置文件存在且格式正确

- **WHEN** 检查仓库根目录
- **THEN** SHALL 存在 `wrangler.jsonc` 文件，包含 `name`、`compatibility_date`、`main`、`assets`、`d1_databases` 五个顶层键

#### Scenario: Workers 部署成功

- **WHEN** 执行 `npx wrangler deploy`
- **THEN** Wrangler SHALL 读取 `main` 字段指定的 Worker 入口，将 Hono API + 静态资产部署为一体化 Worker，不报 database_id 验证错误

#### Scenario: API 端点由 Worker 处理

- **WHEN** 部署成功后访问 `GET /health`
- **THEN** Worker SHALL 返回 `Content-Type: application/json` 响应（由 `run_worker_first` 路由保证）

#### Scenario: SPA 路由正确处理

- **WHEN** 用户访问 `/workbench/submitter` 等前端路由路径
- **THEN** Workers SHALL 返回 `index.html`（由 `not_found_handling: "single-page-application"` 保证），而非 404

#### Scenario: D1 数据库绑定可用

- **WHEN** Worker 处理 API 请求时
- **THEN** SHALL 通过 `c.env.DB` 获取 D1 数据库绑定，Drizzle ORM 实例由 `db/d1.ts` 工厂函数创建

