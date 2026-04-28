## 1. 项目根目录初始化

- [ ] 1.1 初始化根目录 package.json（name: ticketflow, private: true）
- [ ] 1.2 创建 pnpm-workspace.yaml 声明三个工作区
- [ ] 1.3 创建 tsconfig.base.json 共享 TypeScript 配置
- [ ] 1.4 创建 .gitignore（node_modules、dist、*.db 等）
- [ ] 1.5 创建 .npmrc（shamefully-hoist=true 或其他 pnpm 配置）

## 2. 共享类型包（packages/shared）

- [ ] 2.1 初始化 packages/shared/package.json（name: @ticketflow/shared）
- [ ] 2.2 配置 packages/shared/tsconfig.json（继承 base，声明 main/types 入口）
- [ ] 2.3 创建示例类型文件 src/index.ts（导出一个示例类型如 AppInfo）
- [ ] 2.4 验证 workspace:* 引用可行

## 3. 后端环境（apps/server）

- [ ] 3.1 初始化 apps/server/package.json
- [ ] 3.2 安装依赖：hono、drizzle-orm、better-sqlite3 及对应类型
- [ ] 3.3 配置 apps/server/tsconfig.json（继承 base，target: ESNext, module: ESNext）
- [ ] 3.4 创建 Hono 入口文件 src/index.ts（含 /health 端点）
- [ ] 3.5 创建 Drizzle 数据库连接配置 src/db/index.ts
- [ ] 3.6 配置开发脚本（tsx watch 启动）
- [ ] 3.7 添加 @ticketflow/shared 依赖并验证引用

## 4. 前端环境（apps/web）

- [ ] 4.1 使用 Vite 初始化 React + TypeScript 前端应用
- [ ] 4.2 配置 apps/web/tsconfig.json（继承 base，jsx: react-jsx）
- [ ] 4.3 配置 vite.config.ts（如有需要配置路径别名）
- [ ] 4.4 创建基础 App 组件
- [ ] 4.5 添加 @ticketflow/shared 依赖并验证引用

## 5. 开发工具链

- [ ] 5.1 安装并配置 ESLint（typescript-eslint）到根目录
- [ ] 5.2 安装并配置 Prettier 到根目录，创建 .prettierrc
- [ ] 5.3 安装并配置 Vitest（前后端工作区各自的 vitest.config.ts）
- [ ] 5.4 配置根目录 scripts：dev（concurrently 同时启动前后端）、build、test、lint、format
- [ ] 5.5 为 apps/server 编写 /health 端点测试
- [ ] 5.6 为 packages/shared 编写类型导出测试

## 6. 验证

- [ ] 6.1 `pnpm install` 成功安装所有依赖
- [ ] 6.2 `pnpm dev` 同时启动前端和后端开发服务器
- [ ] 6.3 `pnpm build` 成功构建所有工作区
- [ ] 6.4 `pnpm test` 通过所有测试
- [ ] 6.5 `pnpm lint` 无报错
