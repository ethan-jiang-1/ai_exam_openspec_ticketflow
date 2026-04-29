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

- [x] 提交者能录入并提交一条 ticket
- [x] 调度者能看到该 ticket 并完成一次指派
- [x] 完成者能看到被指派的 ticket 并推进到完成
- [x] 三个工作台看到同一条 ticket 的同一次流转
- [x] 无真实登录情况下角色视角已分开

### 不包含（留给 MVP）

- 真实登录 / 账号体系
- priority / dueDate 等扩展字段
- 服务端权限控制
- 表单高级验证
- 通知 / 实时更新

## 演示步骤

> 2 分钟跑通完整 Demo 流程（三角色工单流转）

**1. 启动服务**

```bash
pnpm install
pnpm dev
```

浏览器打开 http://localhost:5173

**2. 提交者创建工单**

- 在角色选择页点击「提交者」
- 填写工单标题（如 "修复登录页面 Bug"）和描述
- 点击「提交工单」

**3. 调度者指派工单**

- 点击「切换角色」回到选择页
- 点击「调度者」
- 在待指派工单的「指派人」输入框填入 `completer`
- 点击「指派」

**4. 完成者处理工单**

- 切换角色，选择「完成者」
- 点击工单的「开始处理」
- 状态变为 in_progress 后，点击「完成」
- 工单状态变为 completed，流转结束

---

## MVP Roadmap

> 目标：角色身份开始真实影响入口和动作，规则与字段开始承担真实判断。
> 对外口径：Demo → MVP。MVP1/MVP2 仅内部理解，不是新官方层级。

### MVP 验收标准

- [x] 最小角色登录 / 身份区分
- [x] 不同角色登录后进入不同工作台
- [ ] 角色不同，主线动作权限和可见内容不同
- [ ] priority / assignee / dueDate 等关键字段开始进入主线判断
- [ ] 至少一组关键状态推进有明确规则
- [ ] 非法推进时有清楚反馈
- [ ] 提交者能看到与自己相关的结果视图
- [ ] 登录、字段、规则、反馈一起服务同一条主线

### 决策记录

- **登录方案**：预置 3 个账号（submitter/dispatcher/completer），登录页选择账号即登录，无需密码
- **UI 库**：Ant Design（antd）— 中文产品最自然的选择，Table/Form/Tag/DatePicker/Message/Drawer/Statistic 开箱即用
- **视觉增强**：Dashboard 统计页 + 工单详情 Drawer，让 MVP 看起来像成熟产品

### Change 序列

```
① mvp-ui-upgrade ──────── 引入 Ant Design，重构现有页面和组件 ✓ 已完成
│
├──→ ② mvp-user-auth ──── 用户表 + 预置账号登录 + 会话 + 角色路由 ✓ 已完成
│
├──→ ③ mvp-permission ──── 权限中间件 + Dashboard 统计页（视觉亮点）
│
└──→ ④ mvp-ticket-enrichment ─ priority/dueDate + 工单详情 Drawer（视觉亮点）
        │
        └──→ ⑤ mvp-integration ── 端到端测试 + MVP 演示文档 + README
```

| # | Change | 规模 | 核心交付 | 满足验收 |
|---|--------|------|----------|----------|
| 1 | `mvp-ui-upgrade` | M | antd 依赖 + Layout/Table/Tag/Form/Card 重构 + 精简 CSS | 视觉基础 |
| 2 | `mvp-user-auth` | M | users 表 + seed 3 个预置账号 + auth API + 登录页 + AuthContext + 路由守卫 | #1, #2 |
| 3 | `mvp-permission` | M | 服务端权限中间件 + 403 中文提示 + 前端动作可见性 + Dashboard 统计页 | #3, #6, #7 |
| 4 | `mvp-ticket-enrichment` | S | priority + dueDate + assignee 下拉 + 优先级排序 + 工单详情 Drawer | #4, #5 |
| 5 | `mvp-integration` | S | 端到端集成测试 + 权限测试 + README MVP 演示步骤 | #8 |

### 更强 MVP 参考方向

> MVP 达标后沿同一主线继续补强的方向，到时再推敲。

**MVP1（可能的选择）— 沿"身份更真实 + 规则更稳"方向**

- 密码认证（预置账号加密码，antd Form 验证）
- Session 过期（cookie TTL + 自动跳转登录页）
- 工单重新指派（dispatcher 可改 assignee）
- 工单筛选/分页（antd Table 内置 filter + pagination）
- 临近到期视觉警告（dueDate 接近时红色高亮）
- 提交者结果视图增强（看到完整处理轨迹）

**MVP2（可能的选择）— 沿"更可用 + 更可观"方向**

- 自定义注册（从预置账号走向自注册用户名）
- 工单评论 / 完成备注（新增 comments 表）
- 工单关闭 / 拒绝（状态机扩展：submitted → rejected）
- 批量操作（批量指派、批量关闭）
- Dashboard 图表（antd Chart 柱状图/饼图展示趋势）
- 移动端响应式（antd Grid + 响应式断点）
