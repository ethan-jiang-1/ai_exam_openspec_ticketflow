## ADDED Requirements

### Requirement: FE-001 React + Vite 前端应用

`apps/web` SHALL 是一个基于 React 18 和 Vite 5 的前端应用，支持 TypeScript 和热模块替换（HMR）。

#### Scenario: 启动前端开发服务器

- **WHEN** 在根目录执行 `pnpm dev`
- **THEN** Vite 开发服务器 SHALL 启动在端口 5173，控制台输出 `Local: http://localhost:5173/`，支持 HMR

#### Scenario: 构建前端生产版本

- **WHEN** 在根目录执行 `pnpm build`
- **THEN** Vite SHALL 将前端应用构建到 `apps/web/dist` 目录，`index.html` 和 JS bundle 存在于该目录中

### Requirement: FE-002 前端 TypeScript 配置

`apps/web` SHALL 有独立的 `tsconfig.json`，继承根目录的 `tsconfig.base.json`，配置 `jsx: "react-jsx"` 和路径别名。

#### Scenario: 前端 TypeScript 编译 JSX 无错误

- **WHEN** 在 `apps/web/src/App.tsx` 中编写包含 JSX 的 TypeScript 代码
- **THEN** `npx tsc --noEmit`（在 apps/web 目录）SHALL 退出码为 0，无类型错误

### Requirement: FE-003 Vite API 代理配置

`apps/web` 的 `vite.config.ts` SHALL 配置开发代理，将 `/api` 前缀的请求转发到后端服务器。

#### Scenario: 前端通过代理访问后端 API

- **WHEN** 在开发环境下，浏览器向 `http://localhost:5173/api/health` 发送 GET 请求
- **THEN** Vite proxy SHALL 将请求转发到 `http://localhost:3000/health`，响应 `{ "status": "ok" }` 和 200 状态码返回给浏览器
