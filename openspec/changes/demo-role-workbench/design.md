## Context

后端 API 已就绪（change ②），6 个端点可用：`GET/POST /api/tickets`、`GET /api/tickets/:id`、`PATCH .../assign|start|complete`。前端当前是一个空白的 Vite + React 19 应用，无路由、无组件库、无样式框架。Vite proxy 已配置但 rewrite 规则有 bug（会把 `/api` 前缀去掉，导致 404）。

## Goals / Non-Goals

**Goals:**
- 角色选择页：用户选择角色后进入对应工作台
- 三个角色工作台，分别展示与该角色相关的工单和操作
- 工作台通过 API client 与后端交互
- 修复 Vite proxy 配置

**Non-Goals:**
- 不引入 CSS 框架（Tailwind / MUI 等），使用原生 CSS + 现有 CSS 变量
- 不做真实登录 / 账号体系
- 不做响应式布局（Demo 阶段桌面端即可）
- 不做实时更新（需手动刷新获取最新数据）

## Decisions

### D1: 使用 react-router-dom 做路由

安装 `react-router-dom`（v7），使用 `BrowserRouter` + `Routes` + `Route` 实现页面切换。

路由结构：
```
/                    → 角色选择页
/workbench/submitter → 提交者工作台
/workbench/dispatcher → 调度者工作台
/workbench/completer → 完成者工作台
```

**理由**: React Router 是 React 生态的标准路由方案，v7 与 React 19 兼容。

### D2: 角色状态用 localStorage + React Context

选择角色后存入 `localStorage`（key: `ticketflow-role`），通过 React Context 在组件树中共享。页面刷新后自动恢复角色。Layout 顶部提供"切换角色"按钮，点击回到角色选择页。

**理由**: Demo 阶段不需要真实登录。localStorage 简单可靠，刷新不丢失。Context 提供全局状态，避免 prop drilling。

### D3: API client 集中封装

在 `apps/web/src/api/` 目录下创建 `client.ts`，封装所有 API 调用。使用原生 `fetch`，不引入 axios。

API 函数：
- `getTickets()` → `GET /api/tickets`
- `getTicket(id)` → `GET /api/tickets/:id`
- `createTicket(data)` → `POST /api/tickets`
- `assignTicket(id, assignedTo)` → `PATCH /api/tickets/:id/assign`
- `startTicket(id)` → `PATCH /api/tickets/:id/start`
- `completeTicket(id)` → `PATCH /api/tickets/:id/complete`

**理由**: 集中管理 API 调用，组件层不关心 URL 构造和请求细节。原生 fetch 够用，无需额外依赖。

### D4: 修复 Vite proxy rewrite

当前 `vite.config.ts` 的 proxy 配置会将 `/api/tickets` rewrite 成 `/tickets`，但 server 端路由挂载在 `/api/tickets`。需要去掉 `rewrite` 规则，让前端 `/api/tickets` 直接转发到 `http://localhost:3000/api/tickets`。

**理由**: 前后端路径保持一致，减少心智负担。

### D5: 页面结构

每个工作台页面结构一致：
1. 页面加载时调用 API 获取工单列表
2. 渲染工单列表（表格或卡片形式）
3. 每条工单显示：标题、状态、创建者、指派人、时间
4. 可操作的工单显示操作按钮（指派 / 开始 / 完成）

**理由**: 统一的页面结构降低实现复杂度，三个工作台只在数据过滤和操作按钮上有差异。

### D6: 配置管理

本 change 不引入新环境变量。复用现有 `VITE_PORT`（默认 5173）和 `SERVER_PORT`（默认 3000）。

### D7: 开发代理策略

修复现有 Vite proxy 配置（D4）。开发时前端 `http://localhost:5173`，API 请求 `/api/*` 自动代理到 `http://localhost:3000`。生产部署时需通过反向代理（nginx 等）统一入口，不在 Demo 范围内。

### D8: 测试策略

前端测试使用 Vitest + `@testing-library/react`。组件测试验证渲染输出和交互行为。API client 测试验证请求构造（使用 `fetch` mock）。不引入 E2E 测试框架 — Demo 阶段手动验证即可。

## Directory Layout

```
apps/web/src/
├── main.tsx                      # 修改：引入 BrowserRouter
├── App.tsx                       # 修改：路由配置
├── App.css                       # 修改：工作台全局样式
├── index.css                     # 不变
├── api/
│   └── client.ts                 # 新增：API 调用封装
├── context/
│   └── RoleContext.tsx            # 新增：角色状态 Context
├── components/
│   └── Layout.tsx                 # 新增：共享布局（角色标识 + 切换）
│   └── Layout.css
├── pages/
│   ├── RoleSelect.tsx             # 新增：角色选择页
│   ├── RoleSelect.css
│   ├── SubmitterWorkbench.tsx     # 新增：提交者工作台
│   ├── DispatcherWorkbench.tsx    # 新增：调度者工作台
│   └── CompleterWorkbench.tsx     # 新增：完成者工作台
└── __tests__/
    └── client.test.ts             # 新增：API client 测试
```

## Risks / Trade-offs

- **[Risk] react-router-dom v7 与 React 19 兼容性** → 已确认兼容，react-router v7 官方支持 React 19
- **[Risk] 无 CSS 框架，样式可能不一致** → Demo 阶段可接受。使用现有 CSS 变量保持基础一致性
- **[Risk] 无错误边界，API 调用失败时白屏** → API client 统一 try/catch，失败时显示错误提示

## Open Questions

1. **react-router-dom 用 v6 还是 v7？** — 假设用 v7（最新稳定版，React 19 兼容）。
2. **工单列表用表格还是卡片？** — 假设用简单表格（Demo 阶段清晰度优先）。
