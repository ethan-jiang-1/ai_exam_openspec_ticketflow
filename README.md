# TicketFlow

工单流程处理工具 — TypeScript 全栈应用。

## 前置要求

- Node.js >= 18.0.0
- pnpm

## 快速开始

```bash
pnpm install
cp .env.example .env
pnpm dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3000

## 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 同时启动前端和后端开发服务器 |
| `pnpm build` | 构建所有工作区 |
| `pnpm test` | 运行所有测试 |
| `pnpm lint` | ESLint 代码检查 |
| `pnpm format` | Prettier 格式化 |
| `pnpm check` | **健康检测** — build + test + lint 一键验证 |

## 环境健康检测

环境搭建完成后，运行：

```bash
pnpm check
```

此命令依次执行 build、test、lint，全部通过即表示开发环境正常。

## Demo Roadmap

> 目标：三角色（提交者/调度者/完成者）工作台分开，`提交→调度→完成` 主流程跑通。
> 粗糙但不假 — 不需要真实登录，但角色视角必须分开。

### Change 序列

```
① ticket-domain-types ──── 共享类型定义（Role / TicketStatus / Ticket）
│
├──→ ② ticket-db-schema ──→ ③ ticket-api ──────────────────────┐
│     Drizzle 建表            CRUD + 状态流转 (assign/start/     │
│                             complete)                         │
│                                                               │
└──→ ④ demo-role-session ──→ ⑤ frontend-routing ───────────────┤
      角色选择（无登录）         React Router + Layout shell     │
                                                                │
                  ⑥ workbench-ui ←──────────────────────────────┘
                  三角色工作台完整 UI（最大 change）
                        │
                  ⑦ demo-polish
                  收尾打磨 + 集成测试
```

| # | Change | 规模 | 交付物 | 依赖 |
|---|--------|------|--------|------|
| 1 | `ticket-domain-types` | S | packages/shared 中 Role、TicketStatus、Ticket 等类型 | 无 |
| 2 | `ticket-db-schema` | S | Drizzle schema + 迁移，tickets 表可用 | 1 |
| 3 | `ticket-api` | M | REST API：CRUD + assign/start/complete 状态流转 | 2 |
| 4 | `demo-role-session` | S | 角色选择页 + RoleContext + GET /api/roles | 1 |
| 5 | `frontend-routing` | S | React Router + Layout + 4 个路由占位页 | 4 |
| 6 | `workbench-ui` | L | 三角色工作台完整 UI，对接 API | 3, 5 |
| 7 | `demo-polish` | S | Status badge、时间格式化、集成测试、演示说明 | 6 |

### 关键路径

`①→②→③→⑥→⑦`（可并行：②‖④，③‖⑤）

### Demo 验收标准

- [ ] 提交者能录入并提交一条 ticket
- [ ] 调度者能看到该 ticket 并完成一次指派
- [ ] 完成者能看到被指派的 ticket 并推进到完成
- [ ] 三个工作台看到同一条 ticket 的同一次流转
- [ ] 无真实登录情况下角色视角已分开

### 不包含（留给 MVP）

- 真实登录 / 账号体系
- priority / dueDate 等扩展字段
- 服务端权限控制
- 表单高级验证
- 通知 / 实时更新
