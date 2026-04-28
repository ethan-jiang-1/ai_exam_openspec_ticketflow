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
├──→ ② ticket-data-api ──── 建表 + 迁移 + CRUD API + 状态流转
│
└──→ ③ demo-frontend ────── 角色选择 + 路由 + 三个工作台 UI
        │
        └──→ ④ demo-polish ─ 收尾打磨 + 集成测试 + 演示说明
```

| # | Change | 规模 | 交付物 | 依赖 | 验证方式 |
|---|--------|------|--------|------|----------|
| 1 | `ticket-domain-types` | S | packages/shared 中 Role、TicketStatus、Ticket 等类型 + 常量 | 无 | `pnpm check` 通过，web/server 均 import 无报错 |
| 2 | `ticket-data-api` | M | Drizzle schema + tickets 表 + REST API（CRUD + assign/start/complete） | 1 | `pnpm db:migrate` 成功，curl 可跑通完整状态流转 |
| 3 | `demo-frontend` | L | 角色选择页 + React Router + Layout + 三角色工作台 UI + API 对接 | 1, 2 | 浏览器可演示完整 Demo 流程 |
| 4 | `demo-polish` | S | Status badge、时间格式化、集成测试、演示说明 | 3 | 陌生人按 README 可在 2 分钟内完成演示 |

### 关键路径

`①→②→③→④`（线性，每步都是一个完整可验证的切片）

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
