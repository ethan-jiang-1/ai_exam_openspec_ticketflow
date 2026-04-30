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

完整 Roadmap（Demo + MVP + 未来方向）见 [ROADMAP.md](./ROADMAP.md)。

## 演示步骤

> 2 分钟跑通完整 Demo 流程（三角色工单流转）

**1. 启动服务**

```bash
pnpm install
pnpm dev
```

浏览器打开 http://localhost:5173

**2. 提交者创建工单**

- 在登录页输入用户名 `submitter`，密码 `changeme`，点击「登录」
- 填写工单标题（如 "修复登录页面 Bug"）、描述、优先级和截止日期
- 点击「提交工单」
- 工单出现在下方列表中，可点击查看详情

**3. 调度者指派工单**

- 点击左侧「退出登录」回到登录页
- 输入用户名 `dispatcher`，密码 `changeme`，点击「登录」
- 在待指派的工单行中，通过下拉选择指派人（如 completer）
- 点击「指派」

**4. 完成者处理工单**

- 退出登录，输入用户名 `completer`，密码 `changeme`，点击「登录」
- 点击工单的「开始处理」
- 状态变为 in_progress 后，点击「完成」
- 工单状态变为 completed，流转结束

**5. 管理员管理用户（可选）**

- 退出登录，输入用户名 `admin`，密码 `admin`，点击「登录」
- 进入用户管理工作台，可新增/编辑/删除用户

未来方向（MVP1/MVP2）见 [ROADMAP.md](./ROADMAP.md)。
