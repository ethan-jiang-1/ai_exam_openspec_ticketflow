## Context

TicketFlow 是一个工单流程处理工具，使用 TypeScript 全栈开发，数据库为 SQLite，认证方式为简单的用户名密码。本项目从零开始，没有任何现有代码约束。

**运行时要求：** Node.js >= 18.0.0（ESM 支持、`fetch` 全局 API、`node:` 前缀 import 支持）。通过根目录 `package.json` 的 `engines` 字段声明。

## Goals / Non-Goals

**Goals:**

- 建立清晰可扩展的 monorepo 项目结构
- 前后端共享类型定义，保证端到端类型安全
- 开发体验流畅：一键启动、热重载、统一脚本
- 为后续工单、流程、用户等功能模块提供可靠的基础

**Non-Goals:**

- 不包含任何业务功能实现（工单、流程、用户等）
- 不包含生产环境部署配置（Docker、CI/CD 等）
- 不包含 UI 组件库集成
- 不包含认证系统实现（仅预留目录结构 `apps/server/src/routes/auth.ts` 占位）

## Directory Layout

```
ticketflow/
├── package.json                  # 根 package.json，全局 scripts
├── pnpm-workspace.yaml           # 工作区声明
├── pnpm-lock.yaml                # 锁文件
├── tsconfig.base.json            # 共享 TS 配置
├── .gitignore
├── .npmrc                        # pnpm 配置
├── .env.example                  # 环境变量模板
├── eslint.config.js              # ESLint flat config
├── prettier.config.js            # Prettier 配置
│
├── apps/
│   ├── web/                      # 前端应用
│   │   ├── package.json
│   │   ├── tsconfig.json         # 继承 base + jsx
│   │   ├── vite.config.ts        # 含 API 代理配置
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       └── App.tsx
│   │
│   └── server/                   # 后端 API 服务
│       ├── package.json
│       ├── tsconfig.json         # 继承 base + ESNext
│       ├── tsup.config.ts        # build 配置
│       ├── drizzle.config.ts     # Drizzle Kit 迁移配置
│       └── src/
│           ├── app.ts            # Hono app 定义（可被测试 import）
│           ├── index.ts          # 入口：import app, 调用 listen
│           ├── db/
│           │   ├── index.ts      # Drizzle 连接实例
│           │   └── schema.ts     # Drizzle schema 定义（空，待后续填充）
│           └── routes/
│               ├── health.ts     # /health 端点
│               └── auth.ts       # 占位文件，内容为 TODO 注释
│
└── packages/
    └── shared/                   # 共享类型包
        ├── package.json          # name: @ticketflow/shared
        ├── tsconfig.json         # 继承 base
        └── src/
            └── index.ts          # 导出 AppInfo 类型
```

## Decisions

### 1. Monorepo 工具：pnpm workspaces

**选择：** pnpm workspaces（不使用 Turborepo / Nx）

**理由：** 项目规模中等，pnpm 原生 workspaces 足够，无需引入额外复杂度。`workspace:*` 协议天然支持内部包引用。

### 2. 前端框架：React + Vite

**选择：** React 18 + Vite 5

**理由：** React 生态最成熟，Vite 开发体验极快。后续可按需引入路由（React Router）和状态管理。

**注意事项：** `@ticketflow/shared` 的 `main` 指向 `.ts` 源文件而非预编译产物。Vite 在开发模式（dev server）下可正常处理，但需要在 `vite.config.ts` 中配置 `optimizeDeps.include: ['@ticketflow/shared']` 确保 Vite 预构建时正确处理该包。`apps/web` 的 build 依赖 Vite 的 bundling 能力，会直接将 shared 的源码打包，无需 shared 包自身的 build 步骤。

### 3. 后端框架：Hono

**选择：** Hono

**理由：** 轻量、现代、原生 TypeScript、类型安全的路由和中间件。比 Express 更现代，比 Fastify 更轻量。开发阶段启用 Hono `logger()` 中间件用于请求日志调试。

### 4. ORM：Drizzle ORM

**选择：** Drizzle ORM + better-sqlite3

**理由：** Drizzle 原生支持 SQLite，类型安全，轻量无侵入。schema-first 的设计方式适合先定义模型再开发。better-sqlite3 是同步的 SQLite 驱动，性能好且无 async 复杂性。初始化时默认启用 SQLite WAL 模式以提升读并发性能。

### 5. 测试框架：Vitest

**选择：** Vitest

**理由：** 与 Vite 生态一致，配置共享，速度快，API 与 Jest 兼容。

### 6. 代码规范：ESLint + Prettier

**选择：** ESLint flat config（typescript-eslint）+ Prettier

**理由：** 行业标准组合，ESLint flat config 是新版标准配置方式。

### 7. 开发代理：Vite proxy

**选择：** Vite dev server proxy（非 CORS 方案）

**理由：** 开发环境下通过 Vite 的 `server.proxy` 将 `/api` 请求转发到后端，避免 CORS 问题。前端请求 `/api/health` → Vite proxy → `localhost:3000/health`。后端仍配置 CORS 中间件作为兜底。

### 8. 配置管理：dotenv + .env

**选择：** 使用 `.env` 文件管理环境变量，通过 `import 'dotenv/config'` 在 `apps/server/src/index.ts` 入口文件顶部加载

**理由：** 轻量，与 Node.js 生态一致。`apps/server` 通过 `import 'dotenv/config'` 加载项目根目录的 `.env` 文件，所有路径变量（如 `DATABASE_PATH`）均相对于项目根目录解析。Drizzle Kit 的 `drizzle.config.ts` 中的路径也使用同一解析方式（`path.resolve` 基于 `process.cwd()` 即项目根目录）。`.env.example` 提交到仓库作为模板。

**配置项清单：**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SERVER_PORT` | `3000` | 后端 API 端口 |
| `SERVER_HOST` | `localhost` | 后端监听地址 |
| `DATABASE_PATH` | `./data/ticketflow.db` | SQLite 数据库文件路径（相对于项目根目录） |
| `VITE_PORT` | `5173` | 前端开发服务器端口 |

### 9. 并发启动：concurrently

**选择：** concurrently 同时启动前后端 dev server

**理由：** `pnpm dev` 一条命令启动全部服务，日志统一输出且带前缀区分来源。

### 10. 后端构建：tsup

**选择：** 使用 tsup（基于 esbuild）构建 apps/server

**理由：** tsup 配置极简、构建快速、原生支持 TypeScript、输出 ESM 格式。比 tsc 更适合 Node.js 应用的打包场景。Hono 官方推荐此方案。

**构建产物：** `apps/server/dist/index.js`（ESM 格式），tsup 自动处理 TypeScript 编译和依赖打包。`better-sqlite3` 为 native 模块，配置为 external 不打包进产物。

### 11. App 导出模式（可测试性）

**选择：** 将 Hono app 实例定义与服务器启动分离为两个文件

**理由：** `src/app.ts` 导出 Hono app 实例（挂载中间件和路由），`src/index.ts` 导入 app 并调用 `listen()`。测试文件可直接 `import app from './app'` 而不触发服务器启动。

```
  src/app.ts          src/index.ts
  ┌────────────┐      ┌────────────────────┐
  │ new Hono() │─────▶│ import app         │
  │ 挂载路由   │      │ import 'dotenv'    │
  │ 挂载中间件 │      │ app.listen(port)   │
  │ export app │      └────────────────────┘
  └─────┬──────┘
        │
        │  测试时直接 import
        ▼
  ┌────────────┐
  │ app.test.ts│
  │ app.fetch()│
  │ → 不触发   │
  │   listen() │
  └────────────┘
```

### 12. Workspace 包命名

**选择：** 所有 workspace 包使用 `@ticketflow/` 作用域命名

| 工作区 | 包名 | 用途 |
|--------|------|------|
| packages/shared | `@ticketflow/shared` | 共享类型 |
| apps/server | `@ticketflow/server` | 后端 API |
| apps/web | `@ticketflow/web` | 前端应用 |

**理由：** 作用域命名避免与 npm 包冲突，`pnpm --filter @ticketflow/*` 可精确指定工作区。

## Configuration Management

```
┌─────────────────────────────────────────────────────┐
│                配置流转                               │
│                                                     │
│  .env.example (提交到仓库)                           │
│       │                                             │
│       │  cp .env.example .env                       │
│       ▼                                             │
│  .env (本地，gitignore 已忽略)                       │
│       │                                             │
│       ├──→ apps/server: 读取 SERVER_PORT,            │
│       │    DATABASE_PATH                             │
│       │                                             │
│       └──→ apps/web: Vite 自动读取 VITE_ 前缀变量    │
│                                                     │
│  端口冲突处理:                                       │
│    SERVER_PORT 和 VITE_PORT 在 .env 中可修改         │
│    Vite 默认端口 5173 被占时会自动 +1                │
│    后端端口被占时直接报错退出（显式失败）             │
└─────────────────────────────────────────────────────┘
```

## Request Flow (Dev Environment)

```
  浏览器                    Vite Dev Server              Hono Server
    │                      (localhost:5173)           (localhost:3000)
    │                           │                          │
    │  GET /                    │                          │
    │ ──────────────────────→   │                          │
    │  React SPA (HMR)          │                          │
    │ ←──────────────────────   │                          │
    │                           │                          │
    │  GET /api/health          │                          │
    │ ──────────────────────→   │  proxy /api → :3000     │
    │                           │ ──────────────────────→  │
    │                           │                          │
    │                           │     { status: "ok" }     │
    │    { status: "ok" }       │ ←──────────────────────  │
    │ ←──────────────────────   │                          │
```

## Error Handling Strategy

- API 错误统一使用 JSON 格式：`{ "error": "错误描述", "code": "ERROR_CODE" }`
- 后端使用 Hono 的 `onError` 全局错误处理中间件
- 开发阶段错误响应包含 stack trace，方便调试
- HTTP 状态码遵循 RESTful 约定（4xx 客户端错误，5xx 服务端错误）

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| monorepo 配置复杂度高 | 保持结构扁平，仅 3 个工作区 |
| SQLite 并发写入限制 | 工单系统写入频率低，SQLite 足够；启用 WAL 模式提升并发读性能；后续可迁移到 PostgreSQL |
| Drizzle 生态相对较新 | API 稳定，SQLite 支持完善，社区活跃 |
| 无 UI 组件库可能导致样式不一致 | 后续引入 shadcn/ui 或类似方案 |
| 前后端版本依赖对齐 | 使用 pnpm lockfile 锁定版本，React 18.x / Vite 5.x 固定大版本 |

## Open Questions

（所有前期问题已在 Decisions 中正式决策，当前无遗留问题。新问题随实现过程发现后追加。）
