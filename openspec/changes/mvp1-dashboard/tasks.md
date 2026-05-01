## 1. Dashboard API 后端

**依赖**: 无（可并行开发）

- [ ] 1.1 编写 `apps/server/src/__tests__/dashboard.test.ts` API 集成测试 [DSH-001]
  注：测试中使用相对于"当前时间"的偏移来插入数据（如 `new Date(Date.now() - 2*86400000).toISOString()`），避免硬编码 UTC 时间导致跨时区/跨日期差异。
  - admin 获取 dashboard 数据 (200)
  - dispatcher 获取 dashboard 数据 (200)
  - submitter 访问被拒 (403)
  - completer 访问被拒 (403)
  - 未登录访问 (401)
  - 无工单但存在用户时返回零值（含 priorityDistribution 全 0、recentActivity 为空数组）
  - 有工单但无历史记录时效率指标为 0（不产生 NaN）
  - 平均响应时间计算正确
  - recentActivity 包含 ticketTitle
  - 优先级分布统计正确（仅未完成工单）
- [ ] 1.2 实现 `apps/server/src/routes/dashboard.ts` GET /api/dashboard handler [DSH-001]
  - 通过 Drizzle ORM 查询 overview（含 priorityDistribution）
  - 通过 Drizzle ORM 查询 efficiency（avgResponseMinutes/avgProcessMinutes 使用 Drizzle sql<> 子查询；reassignCount 统计本周改派次数）
  - 通过 Drizzle ORM 查询 workload（从 users LEFT JOIN tickets/ticket_history，确保零负载用户出现在结果中；completedThisWeekCount 从 ticket_history 统计并用 COUNT DISTINCT 去重）
  - 通过 Drizzle ORM JOIN ticket_history + tickets 查询 recentActivity（最近 10 条，含 ticketTitle）
  - 角色权限检查：在 handler 中用 `if (user.role !== 'admin' && user.role !== 'dispatcher') return c.json({ error }, 403)`
  - 效率指标查询空集合时返回 0 而非 NaN。
- [ ] 1.3 在 `apps/server/src/app.ts` 挂载 dashboard 路由 [DSH-001]

## 2. 共享类型

**依赖**: 无（可并行开发）

- [ ] 2.1 在 `packages/shared/src/dashboard-types.ts` 新增 `DashboardData` 类型（含 DashboardOverview、DashboardEfficiency、DashboardWorkloadItem、RecentActivityItem 接口；`RecentActivityItem.action` 复用已有的 `TicketHistoryAction` 类型），并在 `packages/shared/src/index.ts` 中 re-export [DSH-001][DSH-002]

## 3. Dashboard 前端页面

**依赖**: Group 1（API 端点需先存在）。其中 task 3.4（Layout.tsx）和 3.5（App.tsx）不依赖 API，可与 Group 1 并行开发。

- [ ] 3.1 在 `apps/web/src/api/client.ts` 添加 `getDashboard()` 函数，返回类型使用 `DashboardData` [DSH-002]
- [ ] 3.2 编写 `apps/web/src/__tests__/dashboard.test.tsx` 组件测试 [DSH-002][DSH-003]
  - admin 查看 Dashboard 完整面板（4 KPI + 仪表盘 + 优先级 Progress + 效率指标 + 负载 Table + Timeline）
  - 页面加载中显示 Spin 组件
  - 点击 Timeline 中 ticketTitle 弹出 TicketDetailDrawer
  - Dashboard API 调用失败（显示错误，不白屏）
  - 完成率为 0 时仪表盘显示 0
  - 负载表格中 Progress 条颜色正确（使用 PRIORITY_COLORS/STATUS_COLORS 常量）
  - 无 recentActivity 时 Timeline 显示 Empty
  - admin 和 dispatcher 看到数据面板链接，submitter 和 completer 看不到
  - submitter/completer 访问 /dashboard 被重定向，admin/dispatcher 正常访问
  - 测试使用 mock fetch 模拟 API 响应，AuthContext 通过 mock AuthProvider 注入不同角色用户
  注：角色导航可见性测试需要渲染包含 Layout 的组件树（`<Routes><Route element={<Layout />}><Route index element={<DashboardPage />} /></Route></Routes>`），路由重定向测试需要渲染包含 ProtectedLayout + DashboardGuard 的完整路由
- [ ] 3.3 实现 `apps/web/src/pages/DashboardPage.tsx` 统计面板页面 [DSH-002]
  - 行 1: 4 个 Card+Statistic（数字跳动效果）— total/createdThisWeek/completedThisWeek/pending
  - 行 2: Progress type="dashboard"（完成率仪表盘）+ 3 条 Progress 条（优先级分布，颜色使用 PRIORITY_COLORS 常量）
  - 行 3: 3 个 Card+Statistic（效率指标）— avgResponseMinutes/avgProcessMinutes/reassignCount
  - 行 4: Table（含 Progress 条嵌入待处理/处理中列，pagination=false；待处理用 STATUS_COLORS.assigned，处理中用 blue（因 STATUS_COLORS.in_progress='processing' 不可用于 strokeColor））
  - 行 5: Timeline（最近 10 条动态，dot 颜色按 action 区分，颜色使用 STATUS_COLORS 常量；ticketTitle 可点击弹出 TicketDetailDrawer）
  - loading 状态（Spin）+ 错误处理（message.error）
- [ ] 3.4 修改 `apps/web/src/components/Layout.tsx` Header 添加 "数据面板" 导航按钮 [DSH-003][WF-002]
  - 仅 admin/dispatcher 可见（antd `Button` type="link"）
  - 点击跳转 `/dashboard`
- [ ] 3.5 修改 `apps/web/src/App.tsx` 添加 `/dashboard` 路由 + 角色守卫 [DSH-003][WF-008]
  - 在现有 `<Route path="/workbench" element={<ProtectedLayout />}>` 同级添加 `<Route path="/dashboard" element={<ProtectedLayout />}>`
  - DashboardGuard：`if (user.role !== 'admin' && user.role !== 'dispatcher') return <Navigate to={/workbench/${user.role}} replace />`
  - 类型行为：admin/dispatcher 允许访问，submitter/completer 重定向

## 4. 集成验证

**依赖**: Groups 1+2+3 全部完成

- [ ] 4.1 运行 `pnpm check` 确认所有测试通过 + build 成功
