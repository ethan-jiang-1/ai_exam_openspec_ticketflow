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
