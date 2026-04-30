# CLAUDE.md

TicketFlow — 工单流程处理工具，TypeScript 全栈 pnpm monorepo。

SDLC 遵循 OpenSpec：propose → design → specs → tasks → apply → archive。

## 目录

```
├── apps/
│   ├── server/          Hono API 服务（Drizzle + SQLite）
│   └── web/             React 前端（Vite + antd + React Router）
├── packages/
│   └── shared/          共享类型（@ticketflow/shared）
├── openspec/
│   ├── specs/           13 个能力 spec
│   └── changes/archive/ 已归档 change
├── scripts/             辅助脚本（冒烟/诊断/调查，见 scripts/README.md）
├── data/                SQLite 数据文件
└── docs/                运维文档
```

## 关键文件

| 文件 | 说明 |
|------|------|
| `pnpm-workspace.yaml` | 工作区配置 |
| `tsconfig.base.json` | 共享 TS 配置 |
| `apps/server/src/app.ts` | 服务端 Hono app + 路由挂载 |
| `apps/server/src/db/schema.ts` | Drizzle schema（users / tickets 表） |
| `apps/server/src/routes/auth.ts` | 登录/登出/会话 API |
| `apps/server/src/routes/tickets.ts` | 工单 CRUD API |
| `apps/server/src/routes/admin.ts` | 用户管理 API |
| `apps/server/src/middleware/auth.ts` | Cookie 会话认证中间件 |
| `apps/server/src/lib/permissions.ts` | 角色权限逻辑 |
| `apps/server/src/lib/password.ts` | PBKDF2-SHA256 密码哈希 |
| `apps/web/src/App.tsx` | 路由定义 |
| `apps/web/src/context/AuthContext.tsx` | 认证状态管理 |
| `apps/web/src/pages/LoginPage.tsx` | 正式登录页（表单式） |
| `apps/web/src/pages/LoginPageDev.tsx` | 开发调试登录页 |
| `apps/web/src/api/client.ts` | API 请求封装 |
| `packages/shared/src/ticket-types.ts` | Ticket/Role/TicketStatus 类型 |

## 命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动前端 + 后端 |
| `pnpm build` | 构建所有工作区 |
| `pnpm test` | 运行所有测试 |
| `pnpm lint` | ESLint 检查 |
| `pnpm check` | build + test + lint 一键验证 |
| `pnpm e2e` | Playwright 浏览器端到端测试 |
| `pnpm e2e:local` | 对本地 localhost 跑 E2E |
| `pnpm e2e:remote` | 对 Cloudflare 远程跑 E2E |
| `pnpm e2e:diagnose` | 诊断模式（headed 可见浏览器） |
| `pnpm e2e:investigate` | 调查模式（headless 探查，捕获全量诊断数据） |
