# TicketFlow

角色驱动的工单流转系统，实现「**提交 → 指派 → 处理 → 完成**」的完整工作流。

它解决小团队任务口头交代、状态不可见的问题。提交者创建工单，调度者统一分配，完成者处理后流转，管理员全局视角。每条工单都有 ticket_history 记录完整的操作时间线。

项目按 OpenSpec 规格驱动开发：propose → design → specs → tasks → apply → archive，每次变更都有完整的设计、规格和任务记录。

## 快速开始

```bash
pnpm install
pnpm dev                 # 前端 :5173 + 后端 :3000
```

`cp .env.example .env` 可跳过（均有默认值）。服务启动时自动建表。

## 预置账号

先启动一次让表创建好，再写入演示数据：

```bash
pnpm --filter @ticketflow/server run db:seed
```

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `submitter` | `changeme` | 提交者 |
| `dispatcher` | `changeme` | 调度者 |
| `completer` | `changeme` | 完成者 |
| `completer2` | `changeme` | 完成者（演示重新指派） |
| `admin` | `admin` | 管理员 |

seed 写入 5 用户 + 10 工单（覆盖全部状态）+ 完整 ticket_history，可直接演示或 Dashboard 截图。

## 2 分钟演示

1. `pnpm dev` → http://localhost:5173
2. submitter 登录 → 创建工单
3. dispatcher 登录 → 指派给 completer
4. completer 登录 → 开始处理 → 完成
5. admin 登录 → 查看数据面板或管理用户

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动前端 + 后端 |
| `pnpm check` | build + test + lint 一键验证 |
| `pnpm test` | 单元测试（Vitest） |
| `pnpm e2e` | 浏览器端到端测试（Playwright） |

## 技术概要

前端 React 19 + antd 6 + Vite，后端 Hono 4 + SQLite + Drizzle ORM，pnpm monorepo。Cookie session（24h TTL）+ PBKDF2-SHA256 认证。Vite 将 `/api` 请求 proxy 到后端，前端无需配置 API base URL。

## 目录

| 目录 | 说明 |
|------|------|
| [apps/](apps/) | server（Hono API） + web（React 前端） |
| [packages/](packages/) | `@ticketflow/shared` 共享类型 |
| [tests/](tests/) | Playwright E2E 测试 |
| [data/](data/) | SQLite 数据库文件 |
| [docs/](docs/) | 运维参考文档 |
| [openspec/](openspec/) | OpenSpec 规格与变更管理 |
| [scripts/](scripts/) | 辅助脚本（冒烟/诊断/调查） |

MVP1 已完成，进展详见 [ROADMAP.md](./ROADMAP.md)。
