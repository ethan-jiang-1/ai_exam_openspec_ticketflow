## MODIFIED Requirements

### Requirement: FE-001 React + Vite 前端应用

`apps/web` SHALL 是一个基于 React 19 和 Vite 8 的前端应用，支持 TypeScript 和热模块替换（HMR）。`apps/web/package.json` 的 dependencies SHALL 包含 `react-router-dom`（运行时路由依赖）。

#### Scenario: 启动前端开发服务器

- **WHEN** 在根目录执行 `pnpm dev`
- **THEN** Vite 开发服务器 SHALL 启动在端口 5173（可通过 `.env` 中的 `VITE_PORT` 配置），控制台输出 `Local: http://localhost:<port>/`，支持 HMR

#### Scenario: 构建前端生产版本

- **WHEN** 在根目录执行 `pnpm build`
- **THEN** Vite SHALL 将前端应用构建到 `apps/web/dist` 目录，`index.html` 和 JS bundle 存在于该目录中

#### Scenario: Cloudflare Pages 隔离构建成功

- **WHEN** Cloudflare Pages 执行 `pnpm install --frozen-lockfile && pnpm run build`
- **THEN** `apps/web` 的 `tsc -b && vite build` SHALL 成功执行，不报 `Cannot find module 'react-router-dom'`
