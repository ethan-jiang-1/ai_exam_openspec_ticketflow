## 1. 项目根目录初始化 [PS-001, PS-002]

> 依赖：无

- [x] 1.1 初始化根目录 `package.json`（name: ticketflow, private: true, scripts 占位，engines: { node: ">=18.0.0" }） [PS-002]
- [x] 1.2 创建 `pnpm-workspace.yaml` 声明 `apps/*` 和 `packages/*` [PS-001]
- [x] 1.3 创建 `tsconfig.base.json`（strict: true, target: ESNext, moduleResolution: bundler） [PS-002]
- [x] 1.4 确认 `.gitignore` 包含 `node_modules/`、`dist/`、`*.db`、`*.db-journal`、`*.db-wal`、`.env`、`.env.local`、`coverage/` [PS-002]
- [x] 1.5 创建 `.npmrc`（内容为空文件，不设置 shamefully-hoist，保持严格依赖隔离） [PS-002]
- [x] 1.6 创建 `.env.example`（SERVER_PORT=3000, SERVER_HOST=localhost, DATABASE_PATH=./data/ticketflow.db, VITE_PORT=5173） [PS-003]
- [x] 1.7 复制 `.env.example` 为 `.env` [PS-003]

## 2. 共享类型包（packages/shared）[ST-001, ST-002, ST-003]

> 依赖：Task Group 1

- [x] 2.1 初始化 `packages/shared/package.json`（name: @ticketflow/shared, main/types 指向 src/index.ts, scripts: `{ "build": "tsc --noEmit", "test": "vitest run" }`） [ST-001, ST-002]
- [x] 2.2 配置 `packages/shared/tsconfig.json`（继承 tsconfig.base.json） [ST-002]
- [x] 2.3 创建 `packages/shared/src/index.ts`，导出 `AppInfo` interface 和 `APP_INFO` 运行时常量（`{ name: "ticketflow", version: "0.1.0" } as const`） [ST-003]
- [x] 2.4 在根目录执行 `pnpm install`，验证 `workspace:*` 引用正常 [ST-001]

## 3. 后端环境（apps/server）[BE-001 ~ BE-005]

> 依赖：Task Group 1, Task Group 2

- [x] 3.1 初始化 `apps/server/package.json`（name: @ticketflow/server, scripts 占位：`{ "dev": "", "build": "", "test": "vitest run" }`） [BE-001]
- [x] 3.2 安装后端依赖：`hono`、`drizzle-orm`、`better-sqlite3`、`dotenv` 及对应类型（`@types/better-sqlite3`） [BE-001, BE-003]
- [x] 3.3 安装后端开发依赖：`tsx`、`drizzle-kit`、`@types/node`、`tsup` [BE-001, BE-003]
- [x] 3.4 配置 `apps/server/tsconfig.json`（继承 base, target: ESNext, module: ESNext） [BE-004]
- [x] 3.5 创建 `apps/server/src/db/index.ts`：使用 better-sqlite3 连接 SQLite，路径从 `DATABASE_PATH` 环境变量读取（使用 `path.resolve(process.cwd(), DATABASE_PATH)` 确保相对于项目根目录），目录不存在时自动创建，启用 WAL 模式 (`pragma journal_mode = WAL`) [BE-003]
- [x] 3.6 创建 `apps/server/src/db/schema.ts`：空 schema 文件，导出空对象（待后续填充） [BE-003]
- [x] 3.7 创建 `apps/server/drizzle.config.ts`（引用 db/schema.ts，数据库路径使用 `path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/ticketflow.db')` 确保与运行时一致） [BE-003]
- [x] 3.8 在 `apps/server/package.json` 添加 `db:migrate` script：`drizzle-kit push` [BE-003]
- [x] 3.9 创建 `apps/server/src/routes/health.ts`：导出 `GET /health` 路由，返回 `{ "status": "ok" }` [BE-001]
- [x] 3.10 创建 `apps/server/src/routes/auth.ts`：占位文件，内容为 TODO 注释 [BE-001]
- [x] 3.11 创建 `apps/server/src/app.ts`：Hono app 定义（挂载 logger 中间件、CORS 中间件、全局错误处理中间件、health 路由），`export default app` [BE-001, BE-002, BE-005]
- [x] 3.12 创建 `apps/server/src/index.ts`：顶部 `import 'dotenv/config'`，导入 app，监听 `SERVER_HOST:SERVER_PORT`（处理端口冲突：捕获 EADDRINUSE 错误并打印明确错误信息后退出） [BE-001]
- [x] 3.13 创建 `apps/server/tsup.config.ts`（entry: src/index.ts, format: esm, clean: true, external: ["better-sqlite3"]） [BE-001]
- [x] 3.14 更新 `apps/server/package.json` scripts：`dev: tsx watch src/index.ts`、`build: tsup` [BE-001]
- [x] 3.15 添加 `@ticketflow/shared` 依赖并验证 `import type { AppInfo }` 可用 [ST-001]

## 4. 前端环境（apps/web）[FE-001 ~ FE-003]

> 依赖：Task Group 1, Task Group 2

- [x] 4.1 使用 `pnpm create vite apps/web --template react-ts` 非交互式初始化 React + TypeScript 前端应用（完成后将 package.json name 改为 `@ticketflow/web`，确认 scripts 包含 `dev`、`build`、`test: vitest run`） [FE-001]
- [x] 4.2 配置 `apps/web/tsconfig.json`（继承 base, jsx: "react-jsx"），替换 Vite 脚手架生成的 tsconfig 配置 [FE-002]
- [x] 4.3 配置 `apps/web/vite.config.ts`：设置 `server.port` 从 `process.env.VITE_PORT || 5173` 读取，设置 `server.proxy` 将 `/api` 转发到 `http://localhost:3000`，设置 `optimizeDeps.include: ['@ticketflow/shared']` 确保 Vite 预构建正确处理 shared 包的 .ts 源文件 [FE-001, FE-003]
- [x] 4.4 创建基础 `apps/web/src/App.tsx` 组件（显示项目名称，引用 @ticketflow/shared 的 APP_INFO） [FE-001, ST-001]
- [x] 4.5 添加 `@ticketflow/shared` 依赖并验证 `import type { AppInfo }` 可用 [ST-001]

## 5. 开发工具链 [DT-001 ~ DT-004]

> 依赖：Task Group 1 ~ 4 全部完成

- [x] 5.1 安装根目录开发依赖：`eslint`、`@eslint/js`、`typescript-eslint`、`eslint-config-prettier`、`globals` [DT-001]
- [x] 5.2 创建根目录 `eslint.config.js`（flat config，配置 typescript-eslint，末尾引入 eslint-config-prettier 关闭与 Prettier 冲突的规则，覆盖 apps/ 和 packages/ 下的 ts/tsx 文件） [DT-001]
- [x] 5.3 安装根目录开发依赖：`prettier` [DT-002]
- [x] 5.4 创建根目录 `prettier.config.js`（单引号、无分号、2 空格缩进、trailing comma: all） [DT-002]
- [x] 5.5 安装根目录开发依赖：`vitest` [DT-003]
- [x] 5.6 创建 `apps/server/vitest.config.ts` [DT-003]
- [x] 5.7 创建 `apps/web/vitest.config.ts` [DT-003]
- [x] 5.8 创建 `packages/shared/vitest.config.ts` [DT-003]
- [x] 5.9 安装根目录开发依赖：`concurrently` [DT-004]
- [x] 5.10 配置根目录 package.json scripts：
  - `dev`: `concurrently -n web,server "pnpm --filter @ticketflow/web dev" "pnpm --filter @ticketflow/server dev"`
  - `build`: `pnpm -r --stream build`
  - `test`: `pnpm -r --stream test`
  - `lint`: `eslint apps/ packages/`
  - `format`: `prettier --write "apps/**/*.ts" "apps/**/*.tsx" "packages/**/*.ts"`
  - `check`: `pnpm build && pnpm test && pnpm lint` [DT-004]

## 6. 测试编写 [DT-003, BE-001, ST-003]

> 依赖：Task Group 5

- [x] 6.1 创建 `apps/server/src/__tests__/health.test.ts`：从 `../app` 导入 app 实例，使用 `app.request('/health')` 测试返回 `{ "status": "ok" }` 和 200 状态码 [DT-003, BE-001]
- [x] 6.2 创建 `packages/shared/src/__tests__/index.test.ts`：验证 `import { APP_INFO } from '../index'` 成功且 `APP_INFO.name === "ticketflow"`、`APP_INFO.version === "0.1.0"` [DT-003, ST-003]

## 7. 端到端验证 [PS-001 ~ DT-004]

> 依赖：Task Group 1 ~ 6 全部完成

- [x] 7.1 `pnpm install` 成功安装所有依赖，无 peer dependency 警告 [PS-001]
- [x] 7.2 `pnpm check` 通过（build + test + lint 全部成功） [DT-004]
- [x] 7.3 `pnpm dev` 同时启动前端（5173）和后端（3000），浏览器访问 `http://localhost:5173/api/health` 返回 `{ "status": "ok" }` [FE-003, BE-001]

## 8. 文档和收尾 [PS-002]

> 依赖：Task Group 7

- [x] 8.1 创建根目录 `README.md`：包含项目简介、Node.js 版本要求（>=18）、快速开始步骤（pnpm install → cp .env.example .env → pnpm dev）、可用 scripts 说明（重点标注 `pnpm check` 用于环境健康检测） [PS-002]
