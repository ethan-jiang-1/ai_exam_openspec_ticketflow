## Why

后端 API（change ②）已经就绪，但浏览器里没有任何 UI 可以操作。需要一个前端应用让三种角色（提交者、调度者、完成者）分别在各自的工作台里完成工单的完整流转。

## What Changes

- 新增 `react-router-dom` 依赖，搭建前端路由
- 实现角色选择页：用户选择 submitter / dispatcher / completer 角色后进入对应工作台
- 实现共享 Layout 组件：顶部显示当前角色 + 切换角色按钮
- 实现三个角色工作台页面：
  - 提交者工作台：创建新工单 + 查看自己创建的工单
  - 调度者工作台：查看待指派的工单 + 执行指派操作
  - 完成者工作台：查看指派给自己的工单 + 开始处理 / 完成
- 新增 API client 层，封装对后端 REST API 的调用
- 修复 Vite dev proxy 配置（当前 rewrite 规则会错误去掉 `/api` 前缀）

## Capabilities

### New Capabilities

- `workflow`: 角色工作台前端 — 涵盖角色选择、路由、Layout、三角色工作台 UI、API client

### Modified Capabilities

（无）

## Impact

- `apps/web/package.json` — 新增 `react-router-dom` 依赖
- `apps/web/vite.config.ts` — 修复 proxy rewrite 规则
- `apps/web/src/main.tsx` — 引入 BrowserRouter
- `apps/web/src/App.tsx` — 替换为路由配置
- `apps/web/src/App.css` — 替换为工作台样式
- `apps/web/src/` — 新增 api/、pages/、components/ 目录及文件
- `apps/web/src/__tests__/` — 新增页面组件测试

## Success Criteria

- 浏览器可完成完整 Demo 流程：选择角色 → 创建工单 → 指派 → 开始处理 → 完成
- 三个工作台看到同一条 ticket 的同一次流转
- `pnpm -w run check`（build + test + lint）全部通过
