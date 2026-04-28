## 1. 项目根目录初始化 [PS-001, PS-002]

> 依赖：无

- [ ] 1.1 初始化根目录 `package.json`（name: ticketflow, private: true, scripts 占位） [PS-002]
- [ ] 1.2 创建 `pnpm-workspace.yaml` 声明 `apps/*` 和 `packages/*` [PS-001]
- [ ] 1.3 创建 `tsconfig.base.json`（strict: true, target: ESNext, moduleResolution: bundler） [PS-002]
- [ ] 1.4 确认 `.gitignore` 包含 `node_modules/`、`dist/`、`*.db`、`*.db-journal`、`*.db-wal`、`.env`、`.env.local`、`coverage/` [PS-002]
- [ ] 1.5 创建 `.npmrc`（暂不设置 shamefully-hoist，保持严格依赖隔离） [PS-002]
- [ ] 1.6 创建 `.env.example`（SERVER_PORT=3000, SERVER_HOST=localhost, DATABASE_PATH=./data/ticketflow.db, VITE_PORT=5173） [PS-003]
- [ ] 1.7 复制 `.env.example` 为 `.env` [PS-003]

## 2. 共享类型包（packages/shared）[ST-001, ST-002, ST-003]

> 依赖：Task Group 1

- [ ] 2.1 初始化 `packages/shared/package.json`（name: @ticketflow/shared, main/types 指向 src/index.ts） [ST-001]
- [ ] 2.2 配置 `packages/shared/tsconfig.json`（继承 tsconfig.base.json） [ST-002]
- [ ] 2.3 创建 `packages/shared/src/index.ts`，导出 `AppInfo` interface（name: string, version: string） [ST-003]
- [ ] 2.4 在根目录执行 `pnpm install`，验证 `workspace:*` 引用正常 [ST-001]

## 3. 后端环境（apps/server）[BE-001 ~ BE-005]

> 依赖：Task Group 1, Task Group 2

- [ ] 3.1 初始化 `apps/server/package.json` [BE-001]
- [ ] 3.2 安装后端依赖：`hono`、`drizzle-orm`、`better-sqlite3`、`dotenv` 及对应类型（`@types/better-sqlite3`） [BE-001, BE-003]
- [ ] 3.3 安装后端开发依赖：`tsx`、`drizzle-kit`、`@types/node` [BE-001, BE-003]
- [ ] 3.4 配置 `apps/server/tsconfig.json`（继承 base, target: ESNext, module: ESNext） [BE-004]
- [ ] 3.5 创建 `apps/server/src/db/index.ts`：使用 better-sqlite3 连接 SQLite，路径从 DATABASE_PATH 环境变量读取，目录不存在时自动创建 [BE-003]
- [ ] 3.6 创建 `apps/server/src/db/schema.ts`：空 schema 文件，导出空对象（待后续填充） [BE-003]
- [ ] 3.7 创建 `apps/server/drizzle.config.ts`（引用 db/schema.ts，配置数据库路径） [BE-003]
- [ ] 3.8 在 `apps/server/package.json` 添加 `db:migrate` script：`drizzle-kit push` [BE-003]
- [ ] 3.9 创建 `apps/server/src/routes/health.ts`：GET /health 返回 `{ "status": "ok" }` [BE-001]
- [ ] 3.10 创建 `apps/server/src/routes/auth.ts`：占位文件，内容为 TODO 注释 [BE-001]
- [ ] 3.11 创建 `apps/server/src/index.ts`：Hono 入口，挂载 CORS 中间件、全局错误处理中间件、health 路由，监听 SERVER_PORT [BE-001, BE-002, BE-005]
- [ ] 3.12 配置 `apps/server` 的 dev script：`tsx watch src/index.ts` [BE-001]
- [ ] 3.13 添加 `@ticketflow/shared` 依赖并验证 `import type { AppInfo }` 可用 [ST-001]

## 4. 前端环境（apps/web）[FE-001 ~ FE-003]

> 依赖：Task Group 1, Task Group 2

- [ ] 4.1 使用 `pnpm create vite` 初始化 React + TypeScript 前端应用到 `apps/web` [FE-001]
- [ ] 4.2 配置 `apps/web/tsconfig.json`（继承 base, jsx: "react-jsx"） [FE-002]
- [ ] 4.3 配置 `apps/web/vite.config.ts`：设置 server.proxy，将 `/api` 转发到 `http://localhost:3000` [FE-003]
- [ ] 4.4 创建基础 `apps/web/src/App.tsx` 组件（显示项目名称，引用 @ticketflow/shared 的 AppInfo） [FE-001, ST-001]
- [ ] 4.5 添加 `@ticketflow/shared` 依赖并验证 `import type { AppInfo }` 可用 [ST-001]

## 5. 开发工具链 [DT-001 ~ DT-004]

> 依赖：Task Group 1 ~ 4 全部完成

- [ ] 5.1 安装根目录开发依赖：`eslint`、`@eslint/js`、`typescript-eslint`、`globals` [DT-001]
- [ ] 5.2 创建根目录 `eslint.config.js`（flat config，配置 typescript-eslint，覆盖 apps/ 和 packages/ 下的 ts/tsx 文件） [DT-001]
- [ ] 5.3 安装根目录开发依赖：`prettier` [DT-002]
- [ ] 5.4 创建根目录 `prettier.config.js` [DT-002]
- [ ] 5.5 安装根目录开发依赖：`vitest` [DT-003]
- [ ] 5.6 创建 `apps/server/vitest.config.ts` [DT-003]
- [ ] 5.7 创建 `apps/web/vitest.config.ts` [DT-003]
- [ ] 5.8 安装根目录开发依赖：`concurrently` [DT-004]
- [ ] 5.9 配置根目录 package.json scripts：`dev`（concurrently 启动前后端）、`build`（按依赖顺序构建）、`test`（运行所有测试）、`lint`（ESLint）、`format`（Prettier） [DT-004]

## 6. 测试编写 [DT-003]

> 依赖：Task Group 5

- [ ] 6.1 创建 `apps/server/src/routes/__tests__/health.test.ts`：测试 GET /health 返回 `{ "status": "ok" }` 和 200 状态码 [DT-003]
- [ ] 6.2 创建 shared 类型导出测试：验证 `import { AppInfo } from '@ticketflow/shared'` 成功且类型包含 name/version 字段 [DT-003, ST-003]

## 7. 端到端验证 [PS-001 ~ DT-004]

> 依赖：Task Group 1 ~ 6 全部完成

- [ ] 7.1 `pnpm install` 成功安装所有依赖，无 peer dependency 警告 [PS-001]
- [ ] 7.2 `pnpm dev` 同时启动前端（5173）和后端（3000），浏览器访问 `http://localhost:5173/api/health` 返回 `{ "status": "ok" }` [FE-003, BE-001]
- [ ] 7.3 `pnpm build` 成功构建所有工作区 [PS-002]
- [ ] 7.4 `pnpm test` 通过所有测试 [DT-003]
- [ ] 7.5 `pnpm lint` 无报错 [DT-001]
