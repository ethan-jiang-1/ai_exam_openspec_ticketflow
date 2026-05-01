## Why

MVP1 缺少全局视角：管理员和调度者无法快速了解工单系统的整体运行状态（吞吐量、处理效率、人员负载、近期动态）。`ticket_history` 表已落地，数据基础就绪，现在可以补齐这块。

## What Changes

- 新增 `GET /api/dashboard` API，返回 overview（总量/本周新建/本周完成/待处理/优先级分布）、efficiency（平均响应时间/平均处理时间/改派次数）、workload（按完成者负载）、recentActivity（最近 10 条操作动态，含工单标题）。完成率由前端根据 `completedThisWeek / createdThisWeek` 计算。
- 新增 `/dashboard` 前端页面，单页滚动布局，使用 antd 控件：
  - 第一行：4 个 `Card` + `Statistic`（数字跳动效果）— 工单总数/本周新建/本周完成/待处理
  - 第二行：`Progress type="dashboard"` 仪表盘（完成率）+ 3 条 `Progress` 条（优先级分布，高/中/低三色）
  - 第三行：3 个 `Statistic`（平均响应/平均处理/改派次数）
  - 第四行：antd `Table`，负载列嵌入 `Progress` 条
  - 第五行：antd `Timeline` + `Tag` 展示最近 10 条操作动态
- Layout Header 为 admin 和 dispatcher 角色新增 "数据面板" 导航链接
- `/dashboard` 路由仅 admin 和 dispatcher 可访问，submitter/completer 访问时重定向到各自工作台

## Capabilities

### New Capabilities

- `dashboard`: 全局统计面板 API (`GET /api/dashboard`) + 前端 DashboardPage（单页滚动，antd Statistic/Progress/Table/Timeline），仅 admin 和 dispatcher 可见

### Modified Capabilities

- `workflow`: WF-002（共享 Layout）Header 增加 "数据面板" 导航链接（仅 admin/dispatcher 可见）；WF-008（路由挂载）新增 `/dashboard` 路由及角色守卫，同时补写缺失的 `/workbench/admin` 路由（代码中已存在，原 spec 遗漏）

## Impact

- `apps/server/src/routes/dashboard.ts` — 新增 API 路由
- `apps/server/src/app.ts` — 挂载 `/api/dashboard` 路由
- `apps/server/src/__tests__/dashboard.test.ts` — API 集成测试
- `apps/web/src/pages/DashboardPage.tsx` — 新增统计面板页面
- `apps/web/src/components/Layout.tsx` — Header 增加 "数据面板" 导航（条件渲染）
- `apps/web/src/App.tsx` — 新增 `/dashboard` 路由 + 角色守卫
- `packages/shared/src/` — 新增 `DashboardData` 类型定义
- `apps/web/src/api/client.ts` — 新增 `getDashboard()` 函数
- `apps/web/src/__tests__/dashboard.test.tsx` — 前端组件测试

## Success Criteria

- `GET /api/dashboard` 返回正确的 overview、efficiency、workload、recentActivity 统计数据
- admin 和 dispatcher 登录后在 Layout Header 看到 "数据面板" 链接，点击进入 `/dashboard`
- submitter 和 completer 在 Header 中看不到 "数据面板" 链接，访问 `/dashboard` 时重定向到各自工作台
- DashboardPage 使用 antd `Statistic`/`Progress`/`Table`/`Timeline` 单页展示所有统计，无内嵌 Tab，无白屏
- 所有新增代码有测试覆盖
