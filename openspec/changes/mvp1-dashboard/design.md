## Context

TicketFlow 已有 `ticket_history` 表记录工单的每一次状态变更（created/assigned/reassigned/started/completed），数据基础就绪。当前 MVP1 缺少全局统计视图，管理员和调度者无法快速了解系统整体运行状态。本 change 在 `ticket_history` 表之上构建统计 API 和可视化面板，不引入新表、不引入图表依赖，纯 antd 控件实现仪表盘效果。

**当前状态：**
- `tickets` 表：id, title, description, status, priority, due_date, created_by, assigned_to, created_at, updated_at
- `ticket_history` 表：id, ticket_id, action, actor, from_status, to_status, details, created_at
- 前端 Layout：`Layout.Header` 显示 "TicketFlow" + 角色 Tag + 用户名 + 退出按钮，无导航菜单
- 路由：`/workbench/:role` 四个工作台 + `/login`，由 `ProtectedLayout` 包裹

**约束：**
- 不引入新 npm 依赖（图表库等）
- 不引入新 DB 表
- 所有 DB 操作通过 Drizzle ORM API，禁用原始 SQL
- admin + dispatcher 可见，submitter + completer 不可见

## Goals / Non-Goals

**Goals:**
- `GET /api/dashboard` 返回 overview（总量/本周新建/本周完成/待处理/优先级分布）、efficiency（平均响应/平均处理/改派次数）、workload（按完成者负载）、recentActivity（最近 10 条操作动态，含工单标题）
- `/dashboard` 页面单页滚动布局，使用 antd `Statistic`（数字跳动）、`Progress`（仪表盘 + 条形进度条）、`Table`（负载表格含进度条）、`Timeline`（最近动态）展示完整仪表盘
- Layout Header 为 admin/dispatcher 增加 "数据面板" 导航入口
- `/dashboard` 路由仅 admin 和 dispatcher 可访问

**Non-Goals:**
- 不引入图表（echarts/recharts 等），antd 内置控件即可实现可视化
- 不引入新的 DB 表或迁移
- 不提供时间范围筛选（MVP1 只展示固定周统计）
- 不提供导出功能
- 不内嵌 Tab 分页，内容一页到底

## Decisions

### Decision 1: Dashboard 路由放在 ProtectedLayout 内

**选择：** `/dashboard` 作为 `ProtectedLayout` 下的独立路由，与 `/workbench/*` 平级。

**理由：** Dashboard 复用同一 Layout Header（用户信息 + 退出按钮），避免重复布局代码。角色守卫独立控制访问权限。

**替代方案：** 新建独立 `DashboardLayout` — 会导致 Header 重复，且用户需在不同布局间切换体验不一致。否决。

### Decision 2: Header 导航用 antd `Button` 而非 Menu

**选择：** 在 Layout Header 中添加一个 `Button`（type="link"）作为 "数据面板" 入口，放在用户名左侧。

**理由：** 当前 Header 极简，无菜单栏。添加单个 Button 破坏性最小，且与现有 "退出" Button 风格一致。仅当 `user.role === 'admin' || user.role === 'dispatcher'` 时渲染。

**替代方案：** 使用 antd `Menu` 组件 — 对 1 个链接来说过重，且需要改变 Header 布局结构，不值得。

### Decision 3: Dashboard API 为独立路由文件

**选择：** `apps/server/src/routes/dashboard.ts`，在 `app.ts` 中挂载。

**理由：** 与现有路由文件（auth.ts, tickets.ts, admin.ts）组织一致，职责清晰。dashboard 统计逻辑独立于工单 CRUD。

### Decision 4: 统计计算在后端完成

**选择：** 所有聚合计算在 `GET /api/dashboard` handler 中通过 Drizzle ORM 查询完成，前端只负责展示。

**理由：** 
- SQLite 聚合性能足够（MVP1 数据量级小）
- 避免前端拉取全量 tickets + ticket_history 后在客户端计算
- API 响应结构清晰，便于测试

### Decision 5: 效率指标从 ticket_history 计算

**选择：** 平均响应时间 = 每条已指派工单的「首次指派时间 - 创建时间」的平均值；平均处理时间 = 每条已完成工单的「完成时间 - 首次指派时间」的平均值。

**理由：** `ticket_history` 表记录了每次操作的 actor 和 timestamp，通过 Drizzle 查询按 ticket_id 分组取 min(created_at) 可得到首次指派/完成时间。

### Decision 6: 不新增 npm 依赖，用 antd 内置控件实现可视化

**选择：** 前端仅使用 antd 内置控件：`Statistic`（数字跳动）、`Progress`（仪表盘 + 条形进度条）、`Table`（表格嵌入进度条）、`Timeline`（时间线）、`Tag`（状态标签）、`Card`、`Row`、`Col`。

**理由：** 
- antd `Progress type="dashboard"` 提供仪表盘效果，`Progress` 条形支持百分比和颜色渐变
- antd `Statistic` 内置数字动画
- antd `Timeline` 用于最近动态展示
- 无需引入 echarts/recharts，减少 bundle 体积

### Decision 7: 单页滚动，不用 Tab

**选择：** 所有内容一页到底，自上而下：KPI 卡片 → 仪表盘 + 优先级分布 → 效率指标 → 负载表格 → 最近动态。

**理由：** 当前数据量少（4 个 KPI + 1 个仪表盘 + 3 条优先级 + 3 个效率值 + 1 个表格 + 1 条时间线），一页足够展示，tab 反而增加点击成本。

## Directory Layout

```
apps/
├── server/
│   └── src/
│       ├── routes/
│       │   └── dashboard.ts          ← NEW: GET /api/dashboard handler
│       ├── app.ts                    ← MODIFY: mount dashboard route
│       └── __tests__/
│           └── dashboard.test.ts     ← NEW: API integration tests
├── web/
│   └── src/
│       ├── pages/
│       │   └── DashboardPage.tsx     ← NEW: Dashboard page component
│       ├── components/
│       │   └── Layout.tsx            ← MODIFY: add nav button (admin/dispatcher)
│       ├── App.tsx                   ← MODIFY: add /dashboard route + guard
│       ├── api/
│       │   └── client.ts            ← MODIFY: add getDashboard() function
│       └── __tests__/
│           └── dashboard.test.tsx    ← NEW: frontend component tests
packages/
└── shared/
    └── src/
        └── dashboard-types.ts        ← NEW: DashboardData type definitions
openspec/
└── specs/
    ├── dashboard/
    │   └── spec.md                   ← NEW: dashboard capability spec
    └── workflow/
        └── spec.md                   ← MODIFY: WF-002 nav, WF-008 route (delta)
```

## API Design

### GET /api/dashboard

**Auth:** Session required, role must be admin or dispatcher. Otherwise 403.

**Response (200):**
```json
{
  "overview": {
    "total": 50,
    "createdThisWeek": 12,
    "completedThisWeek": 8,
    "pending": 20,
    "priorityDistribution": { "high": 5, "medium": 10, "low": 5 }
  },
  "efficiency": {
    "avgResponseMinutes": 45,
    "avgProcessMinutes": 120,
    "reassignCount": 5
  },
  "workload": [
    {
      "username": "completer",
      "displayName": "完成者",
      "assignedCount": 5,
      "inProgressCount": 3,
      "completedThisWeekCount": 4
    }
  ],
  "recentActivity": [
    {
      "id": "h1",
      "ticketId": "t1",
      "ticketTitle": "修复登录页样式",
      "action": "completed",
      "actor": "completer",
      "toStatus": "completed",
      "createdAt": "2026-05-01T10:30:00.000Z"
    }
  ]
}
```

**数据来源：**
- `overview.priorityDistribution`: `tickets` 表按 priority 分组 COUNT（仅未完成工单 status != 'completed'）
- `recentActivity`: `ticket_history` 表 JOIN `tickets` 表（获取 ticketTitle），按 created_at DESC LIMIT 10

DB 列名 ↔ JS 属性名映射（遵循项目命名约定）：
| DB 列名 | JS 属性名 |
|---------|-----------|
| created_at | createdAt |
| assigned_to | assignedTo |
| ticket_id | ticketId |
| display_name | displayName |

## Page Layout

单页滚动，自上而下 5 行：

```
┌──────────────────────────────────────────────────────────────┐
│  Row 1: 4 × Card + Statistic（数字跳动）                       │
│  工单总数: 50    本周新建: 12    本周完成: 8    待处理: 20      │
│  Row/Col: xs={12} sm={6}                                     │
├──────────────────────────────────────────────────────────────┤
│  Row 2: Progress type="dashboard" + 优先级分布 Progress 条    │
│  Col sm={8}: ◉ 完成率 67% 仪表盘                              │
│  Col sm={16}: 紧急 ████████░░░░ 5  中 ████████░░░░ 10         │
│               低   ████████░░░░ 5                             │
│  Progress 颜色使用 @ticketflow/shared 的 PRIORITY_COLORS 常量     │
├──────────────────────────────────────────────────────────────┤
│  Row 3: 3 × Card + Statistic（效率指标）                       │
│  平均响应: 45min    平均处理: 120min    本周改派: 5次          │
│  Row/Col: xs={12} sm={8}                                     │
├──────────────────────────────────────────────────────────────┤
│  Row 4: Table（负载表格，含 Progress 条）                      │
│  完成者  │ 待处理(Progress)     │ 处理中(Progress)     │ 本周完成│
│  张三    │ ████░░ 3(37%)       │ ██░░░ 1(25%)         │    5   │
│  pagination={false}                                           │
│  Progress 颜色使用 STATUS_COLORS: assignedCount=STATUS_COLORS.assigned, inProgressCount=STATUS_COLORS.in_progress│
├──────────────────────────────────────────────────────────────┤
│  Row 5: Timeline（最近动态，最近 10 条）                       │
│  ● 10:30 完成者 完成了工单 "修复登录页样式"  [completed Tag]   │
│  ● 10:15 调度者 将工单 "数据导出报错" 指派给 完成者  [assigned]│
│  ● 10:00 提交者 创建了工单 "新增用户管理页面"  [submitted Tag]  │
│  Timeline dot 颜色按 action 类型区分，使用 STATUS_COLORS 常量映射                           │
└──────────────────────────────────────────────────────────────┘
```

## Test Strategy

- **API 集成测试**: 使用内存 SQLite（`:memory:`）+ Hono `app.request()` 发请求。`beforeEach` 通过 Drizzle ORM API 清空 tickets 和 ticket_history 表，通过 `POST /api/auth/login` 获取 session cookie。测试覆盖：200（admin + dispatcher）、403（submitter + completer）、401（未登录）、零值边界、平均响应时间计算、recentActivity 包含 ticketTitle。
- **前端组件测试**: 使用 vitest + @testing-library/react，mock 全局 `fetch` 模拟 `GET /api/dashboard` 响应。AuthContext 通过 mock `AuthProvider`（设置 `user.role` 为 admin/dispatcher/submitter/completer）测试不同角色的导航可见性和路由重定向。测试覆盖：KPI 数字渲染、Progress 仪表盘、优先级 Progress 条、Table + Progress 条、Timeline 渲染（含 ticketTitle 点击弹出 Drawer）、API 失败错误提示、角色导航可见性、路由重定向。

## Risks / Trade-offs

- **[Risk] avgResponseMinutes/avgProcessMinutes 在数据量增长后计算变慢** → SQLite 聚合在万级数据内性能无问题。MVP1 之后如需优化，可加物化视图或定时缓存。
- **[Risk] "本周" 基于服务器时区，可能与用户时区不一致** → MVP1 阶段使用服务器本地时区，后续可通过 `Intl.DateTimeFormat` 传时区参数改进。
- **[Risk] Progress 仪表盘的最大值（分母）** → "完成率" 用「本周完成 / 本周新建」计算，当本周新建为 0 时返回 0%。依赖前端 `Progress percent` 处理边界。

## Open Questions

1. **统计是否需要按时间范围筛选（本周/本月/自定义）？** — 当前设计固定为「本周」，如有需要可在后续 change 中扩展 `?range=week|month|all` 参数。
2. **workload 是否需要显示所有完成者还是仅活跃完成者？** — 当前返回所有 role=completer 的用户，即使负载为 0。这样管理者可以看到完整人力列表。
3. **Dashboard 是否需要自动刷新？** — 当前设计为静态页面加载，不做轮询。如果有实时监控需求，后续可加 `setInterval` 轮询或 WebSocket 推送。
