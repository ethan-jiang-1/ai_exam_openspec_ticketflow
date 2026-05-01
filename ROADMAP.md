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

## MVP1 阶段

> 目标：在 MVP 身份+权限基础上，补 session 安全、操作审计（ticket_history）、数据筛选、Dashboard 全局视图。
> 核心思路：一张 `ticket_history` 表同时支撑「提交者工作台时间线」和「Dashboard 统计分析」，一次 migration 到位。

### MVP1 验收标准

- [x] Session 24h TTL，过期自动跳转登录页并提示"会话已过期，请重新登录" ✅ mvp1-session-ttl
- [x] 工单可重新指派（dispatcher 在 submitted 或 assigned 状态均可改 assignee） ✅ mvp1-ticket-history
- [x] 三个工作台 Table 支持前端分页 + 状态筛选 ✅ mvp1-filter-timeline
- [x] 提交者工单详情展示完整处理时间线（基于 ticket_history） ✅ mvp1-filter-timeline
- [ ] Dashboard 统计页：总览 + 吞吐量 + 效率 + 人员负载

### 核心数据设计

新增 `ticket_history` 表：

```sql
ticket_history (
  id          TEXT PK,     -- UUID
  ticket_id   TEXT NOT NULL REFERENCES tickets(id),
  action      TEXT NOT NULL,  -- created | assigned | reassigned | started | completed
  actor       TEXT NOT NULL,  -- username
  from_status TEXT,           -- NULL only for 'created'
  to_status   TEXT NOT NULL,
  details     TEXT,           -- JSON: { assignee?, prevAssignee? }
  created_at  TEXT NOT NULL
)
-- 索引
INDEX (ticket_id, created_at)   -- 时间线查询
INDEX (action, created_at)      -- Dashboard 聚合
```

Dashboard 依赖 ticket_history 的查询模式：

| 指标 | 查询方式 |
|------|----------|
| 吞吐量（本周创建/完成） | `GROUP BY strftime('%Y-%W', created_at)` |
| 平均响应时间（提交→指派） | join created + assigned 时间差 |
| 平均处理时间（指派→完成） | join assigned + completed 时间差 |
| 瓶颈（各状态平均停留） | 相邻状态对的 avg 时间差 |
| 重新指派频率 | `COUNT(DISTINCT ticket_id) WHERE action='reassigned'` |
| 人员负载 | `GROUP BY json_extract(details, '$.assignee')` |

### Change 序列

```
① mvp1-session-ttl ──────── Session cookie 24h TTL + 前端自动登出
│
└──→ ② mvp1-ticket-history ─ ticket_history 表 + 迁移回填 + 重新指派 + GET history API
     │
     ├──→ ③ mvp1-filter-timeline  三个工作台分页筛选 + 共享 Timeline 组件 + 提交者时间线
     │
     └──→ ④ mvp1-dashboard ─────── Dashboard API + DashboardPage（Statistic/Card/Table）
```

| # | Change | 规模 | 核心交付 | 依赖 |
|---|--------|------|----------|------|
| 1 | `mvp1-session-ttl` | S | SessionStore 24h TTL + cookie maxAge + AuthContext 401 拦截 + 过期提示 | 无 | ✓ |
| 2 | `mvp1-ticket-history` | M | ticket_history schema + 迁移 + 回填 + 所有状态变更写入历史 + assign 扩展支持重新指派 + `GET /api/tickets/:id/history` | 1 | ✓ |
| 3 | `mvp1-filter-timeline` | M | 共享 `TicketDetailDrawer`（含 Timeline）+ 三个工作台 Table 分页 + 状态列筛选 + 提交者时间线视图 | 2 | ✓ |
| 4 | `mvp1-dashboard` | M | `GET /api/dashboard`（overview+throughput+efficiency+workload）+ DashboardPage + 导航入口 `/dashboard` | 2 | 🔜 |

③ 和 ④ 无相互依赖，可并行。

---

## MVP2 参考方向

> 在 MVP1 基础上继续演进的方向，届时再推敲。

### 沿"更可用 + 更可观"

- 自定义注册（从预置账号走向自注册用户名）
- 工单评论 / 完成备注（新增 comments 表，参考 ticket_history 模式）
- 工单关闭 / 拒绝（状态机扩展：submitted → rejected，completed → closed）
- 批量操作（批量指派、批量关闭）
- Dashboard 图表（antd Charts 柱状图/饼图，基于 ticket_history 历史数据）
- 移动端响应式（antd Grid + 响应式断点）
- SLA 预警（ticket_history 已有状态时间戳，可计算各阶段 SLA 达标率）
- 工单活动摘要（ticket_history 聚合 + comments 表 → 生成工单摘要视图）
- 时效报表导出（ticket_history 数据完整，可导出 CSV 效率报告）
