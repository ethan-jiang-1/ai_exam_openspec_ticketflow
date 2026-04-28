## ADDED Requirements

### Requirement: React + Vite 前端应用

`apps/web` SHALL 是一个基于 React 18 和 Vite 5 的前端应用，支持 TypeScript 和热模块替换（HMR）。

#### Scenario: 启动前端开发服务器

- **WHEN** 执行 `pnpm dev`（在 apps/web 或根目录）
- **THEN** Vite 开发服务器 SHALL 启动，支持 HMR，默认端口 5173

#### Scenario: 构建前端生产版本

- **WHEN** 执行 `pnpm build`（在 apps/web 或根目录）
- **THEN** Vite SHALL 将前端应用构建到 `apps/web/dist` 目录

### Requirement: 前端 TypeScript 配置

`apps/web` SHALL 有独立的 `tsconfig.json`，继承根目录的 `tsconfig.base.json`，并配置 JSX 支持和路径别名。

#### Scenario: 前端 TypeScript 编译无错误

- **WHEN** 在 `apps/web` 中编写包含 JSX 的 TypeScript 代码
- **THEN** TypeScript 编译器 SHALL 正确识别 JSX 语法，无类型错误
