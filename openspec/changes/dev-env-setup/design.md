## Context

TicketFlow 是一个工单流程处理工具，使用 TypeScript 全栈开发，数据库为 SQLite，认证方式为简单的用户名密码。本项目从零开始，没有任何现有代码约束。

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
- 不包含认证系统实现（仅预留结构）

## Decisions

### 1. Monorepo 工具：pnpm workspaces

**选择：** pnpm workspaces（不使用 Turborepo / Nx）

**理由：** 项目规模中等，pnpm 原生 workspaces 足够，无需引入额外复杂度。`workspace:*` 协议天然支持内部包引用。

### 2. 前端框架：React + Vite

**选择：** React 18 + Vite 5

**理由：** React 生态最成熟，Vite 开发体验极快。后续可按需引入路由（React Router）和状态管理。

### 3. 后端框架：Hono

**选择：** Hono

**理由：** 轻量、现代、原生 TypeScript、类型安全的路由和中间件。比 Express 更现代，比 Fastify 更轻量。

### 4. ORM：Drizzle ORM

**选择：** Drizzle ORM + better-sqlite3

**理由：** Drizzle 原生支持 SQLite，类型安全，轻量无侵入。schema-first 的设计方式适合先定义模型再开发。better-sqlite3 是同步的 SQLite 驱动，性能好且无 async 复杂性。

### 5. 测试框架：Vitest

**选择：** Vitest

**理由：** 与 Vite 生态一致，配置共享，速度快，API 与 Jest 兼容。

### 6. 代码规范：ESLint + Prettier

**选择：** ESLint（typescript-eslint）+ Prettier

**理由：** 行业标准组合，规则可定制。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| monorepo 配置复杂度高 | 保持结构扁平，仅 3 个工作区 |
| SQLite 并发写入限制 | 工单系统写入频率低，SQLite 足够；后续可迁移到 PostgreSQL |
| Drizzle 生态相对较新 | API 稳定，SQLite 支持完善，社区活跃 |
| 无 UI 组件库可能导致样式不一致 | 后续引入 shadcn/ui 或类似方案 |

## Open Questions

- 无
