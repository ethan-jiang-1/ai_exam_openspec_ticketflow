# Roadmap

> 目标：三角色（提交者/调度者/完成者）工作台分开，`提交→调度→完成` 主流程跑通。
> 粗糙但不假 — 不需要真实登录，但角色视角必须分开。

## Demo 阶段

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

### Demo → MVP 演进

| Demo 不包含 | MVP 状态 |
|------------|----------|
| 真实登录 / 账号体系 | ✅ PBKDF2-SHA256 密码认证 + 4 角色预置账号 + 正式登录页 |
| priority / dueDate 等扩展字段 | ✅ 已交付（mvp-ticket-enrichment） |
| 服务端权限控制 | ✅ requirePermission 中间件 + 6 权限动作 |
| 表单高级验证 | ✅ 登录表单校验 + 创建工单必填校验 |
| 通知 / 实时更新 | 🔜 留待 MVP1+ |

---

## MVP 阶段

> 目标：角色身份开始真实影响入口和动作，规则与字段开始承担真实判断。
> 对外口径：Demo → MVP。MVP1/MVP2 仅内部理解，不是新官方层级。

### MVP 验收标准

- [x] 最小角色登录 / 身份区分
- [x] 不同角色登录后进入不同工作台
- [x] 角色不同，主线动作权限和可见内容不同
- [x] priority / assignee / dueDate 等关键字段开始进入主线判断
- [x] 至少一组关键状态推进有明确规则
- [x] 非法推进时有清楚反馈
- [x] 提交者能看到与自己相关的结果视图
- [x] 登录、字段、规则、反馈一起服务同一条主线

### 决策记录

- **登录方案**：预置 4 个账号（submitter/dispatcher/completer/admin），PBKDF2-SHA256 密码认证
- **UI 库**：Ant Design（antd）— 中文产品最自然的选择，Table/Form/Tag/DatePicker/Message/Drawer/Statistic 开箱即用
- **视觉增强**：Dashboard 统计页 + 工单详情 Drawer，让 MVP 看起来像成熟产品

### Change 序列

```
① mvp-ui-upgrade ──────── 引入 Ant Design，重构现有页面和组件 ✓ 已完成
│
├──→ ② mvp-user-auth ──── 用户表 + 预置账号登录 + 会话 + 角色路由 ✓ 已完成
│
├──→ ③ mvp-permission ──── 权限中间件（Dashboard 推迟到 MVP1） ✓ 已完成
│
└──→ ④ mvp-ticket-enrichment ─ priority/dueDate + assignee 下拉 + 工单详情 Drawer ✓ 已完成
        │
        └──→ ⑤ mvp-user-management ── admin 角色 + 用户 CRUD + 密码认证 ✓ 已完成
                │
                └──→ ⑥ mvp-integration ── 端到端测试 + MVP 演示文档 + README ✓ 已完成
        │
        └──→ ⑦ mvp-login-professional ─ 正式登录页（表单式）+ dev 登录页保留 ✓ 已完成
```

| # | Change | 规模 | 核心交付 | 满足验收 |
|---|--------|------|----------|----------|
| 1 | `mvp-ui-upgrade` | M | antd 依赖 + Layout/Table/Tag/Form/Card 重构 + 精简 CSS | 视觉基础 | ✓ |
| 2 | `mvp-user-auth` | M | users 表 + seed 3 个预置账号 + auth API + 登录页 + AuthContext + 路由守卫 | #1, #2 | ✓ |
| 3 | `mvp-permission` | M | 服务端权限中间件 + 403 中文提示 + 前端动作可见性 | #3, #6, #7 | ✓ |
| 4 | `mvp-ticket-enrichment` | S | priority + dueDate + assignee 下拉 + 优先级排序 + 工单详情 Drawer | #4, #5 | ✓ |
| 5 | `mvp-user-management` | M | admin 角色 + 用户 CRUD API + 密码字段 + 管理员工作台 | 身份体系完善 | ✓ |
| 6 | `mvp-integration` | S | UI 美化 + bug 修复 + 共享常量 + 品牌标识 + 收尾 | #8 | ✓ |
| 7 | `mvp-login-professional` | S | 正式登录页（用户名/密码表单 + 校验 + loading）+ dev 登录页保留 | 产品就绪 | ✓ |

---

## 更强 MVP 参考方向

> MVP 达标后沿同一主线继续补强的方向，到时再推敲。

### MVP1（可能的选择）— 沿"身份更真实 + 规则更稳"方向

- Session 过期（cookie TTL + 自动跳转登录页）
- 工单重新指派（dispatcher 可改 assignee）
- 工单筛选/分页（antd Table 内置 filter + pagination）
- 提交者结果视图增强（看到完整处理轨迹）
- Dashboard 统计页（从 MVP ③ 推迟，等数据丰富后更有价值）

### MVP2（可能的选择）— 沿"更可用 + 更可观"方向

- 自定义注册（从预置账号走向自注册用户名）
- 工单评论 / 完成备注（新增 comments 表）
- 工单关闭 / 拒绝（状态机扩展：submitted → rejected）
- 批量操作（批量指派、批量关闭）
- Dashboard 图表（antd Chart 柱状图/饼图展示趋势）
- 移动端响应式（antd Grid + 响应式断点）
