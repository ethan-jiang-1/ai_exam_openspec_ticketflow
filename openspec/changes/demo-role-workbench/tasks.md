## 1. 依赖安装与配置

- [ ] 1.1 安装 `react-router-dom` 依赖到 `apps/web`（显式声明，不可隐含） [WF-001]
- [ ] 1.2 安装 `@testing-library/react` 和 `@testing-library/jest-dom` 到 `apps/web` devDependencies [WF-008]
- [ ] 1.3 配置 `apps/web/vitest.config.ts`（如不存在则创建），设置 `environment: 'jsdom'`，使 testing-library 组件测试可用 [WF-008]
- [ ] 1.4 修复 `apps/web/vite.config.ts` proxy 配置：去掉 `rewrite` 规则 [WF-007 Scenario 1]

## 2. API Client（依赖 1.4）

- [ ] 2.1 创建 `apps/web/src/api/client.ts`，导出 `getTickets`、`getTicket`、`createTicket`、`assignTicket`、`startTicket`、`completeTicket` 六个函数，使用原生 `fetch` [WF-006]

## 3. 角色状态与 Layout（依赖 1.1）

- [ ] 3.1 创建 `apps/web/src/context/RoleContext.tsx`，实现 `RoleProvider`（读取/写入 localStorage `ticketflow-role`）和 `useRole` hook [WF-001 Scenario 1, 2, 3]
- [ ] 3.2 创建 `apps/web/src/components/Layout.tsx` + `Layout.css`，显示当前角色名称和"切换角色"按钮（清除 localStorage 并跳转 `/`） [WF-002 Scenario 1, 2]

## 4. 路由配置（依赖 2.1, 3.1, 3.2）

- [ ] 4.1 修改 `apps/web/src/main.tsx`，用 `BrowserRouter`（v7 v6 兼容 API）包裹 `App` [WF-008]
- [ ] 4.2 重写 `apps/web/src/App.tsx`，定义路由：`/` → 角色选择页，`/workbench/*` → Layout 包裹的工作台页面，未匹配路由用 `Navigate` 重定向到 `/` [WF-008 Scenario 1]

## 5. 页面实现（依赖 4.2）

- [ ] 5.1 创建 `apps/web/src/pages/RoleSelect.tsx` + `RoleSelect.css`，三个角色按钮，点击存 localStorage 并跳转，已有角色自动跳转，无效角色留在选择页 [WF-001]
- [ ] 5.2 创建 `apps/web/src/pages/SubmitterWorkbench.tsx`，创建工单表单（title 必填校验）+ 工单列表（客户端过滤 `createdBy === "submitter"`）+ API 错误时显示错误提示 [WF-003]
- [ ] 5.3 创建 `apps/web/src/pages/DispatcherWorkbench.tsx`，显示 submitted 状态工单（客户端过滤 `status === "submitted"`）+ 指派人输入框 + 指派按钮 + 无工单时显示提示 + API 错误处理 [WF-004]
- [ ] 5.4 创建 `apps/web/src/pages/CompleterWorkbench.tsx`，显示 `assignedTo === "completer"` 且状态为 assigned/in_progress 的工单（客户端过滤）+ 操作按钮（开始处理/完成）+ API 错误处理 [WF-005]

## 6. 样式（依赖 4.2）

- [ ] 6.1 重写 `apps/web/src/App.css`，替换为工作台全局样式（表格、按钮、表单、布局、错误提示），使用现有 CSS 变量 [WF-003, WF-004, WF-005]

## 7. 测试（依赖 1.3, 5.1~5.4）

- [ ] 7.1 创建 `apps/web/src/__tests__/client.test.ts`，验证 API client 函数构造正确的 fetch 请求（URL、method、body），验证错误状态码抛出异常 [WF-006 Scenario 1, 2]
- [ ] 7.2 创建 `apps/web/src/__tests__/RoleSelect.test.tsx`，验证角色按钮点击后 localStorage 写入和路由跳转，验证已有角色自动跳转 [WF-001 Scenario 1, 2]
- [ ] 7.3 创建 `apps/web/src/__tests__/workbench.test.tsx`，验证三个工作台页面渲染工单列表，验证客户端过滤逻辑（submitter 只看自己的、dispatcher 只看 submitted、completer 只看 assignedTo="completer" 的） [WF-003 Scenario 2, WF-004, WF-005 Scenario 3]

## 8. 验证（依赖 7.1, 7.2, 7.3）

- [ ] 8.1 运行 `pnpm -w run check`（build + test + lint）确认全部通过 [WF-001~008]
