## 1. Shared Types

- [ ] 1.1 `TicketHistoryAction` 类型新增 `'edited'` 和 `'commented'` 字面量 [TKT-018]
  > `ACTION_LABELS` 和 `ACTION_COLORS` 常量保留在 `Timeline.tsx` 本地，不移到 shared（属于 UI 展示逻辑）

## 2. Server API — 原始内容快照 + 编辑 + 备注

- [ ] 2.1 `POST /api/tickets` 创建工单时，在 `ticket_history` 的 `details` 字段存储原始内容快照（title/description/priority/dueDate）[TKT-019]
- [ ] 2.2 新增 `PATCH /api/tickets/:id` 端点：内联校验 submitter 身份（createdBy === user.username）+ status=submitted，支持编辑 title/description/priority/dueDate，每次变更字段写入一条 ticket_history (action=edited)，无变更字段时不写入 [TKT-020]
- [ ] 2.3 新增 `POST /api/tickets/:id/comments` 端点：登录用户可添加备注（≤2000 字符），写入 ticket_history (action=commented) [TKT-021]
- [ ] 2.4 编写服务端集成测试：原始内容快照、编辑 API 成功/未登录/权限拒绝/状态拒绝/空body/title为空/非法priority/超长title/多字段/无变更/404、备注 API 成功/空内容/超长/未登录/404；扩展 Auth guard 测试覆盖新端点 [TKT-019][TKT-020][TKT-021]
  > 新路由在 `tickets.ts` 中注册，`app.ts` 已挂载 `/api/tickets` 前缀，无需修改 app.ts

## 3. Frontend API Client

- [ ] 3.1 `apps/web/src/api/client.ts` 新增 `updateTicket(id, body)` 和 `addComment(id, body)` 函数 [TKT-020][TKT-021]

## 4. Frontend Timeline 扩展

- [ ] 4.1 Timeline 组件新增 `edited` 和 `commented` action 的渲染：edited 显示 "编辑了{字段}" + oldValue→newValue（purple），commented 显示评论文本（green）；`created` 事件的 details 快照不在 Timeline 中渲染 [TKT-018]
- [ ] 4.2 Timeline 测试新增：edited 渲染验证、commented 渲染验证、created details 快照不渲染验证 [TKT-018]

## 5. Frontend TicketDetailDrawer 改造

- [ ] 5.1 TicketDetailDrawer 新增 `enableComments` prop（默认 false）和 `refreshKey` prop（默认 0），useEffect 依赖数组中包含 `refreshKey`，父组件通过递增 `refreshKey` 触发 Timeline 重新拉取 [TKT-018][WF-004][WF-005]
- [ ] 5.2 `enableComments=true` 时在 Drawer 底部（Timeline 之后）渲染备注区域：antd `Input.TextArea`（`maxLength={2000}`、`showCount`、`rows={3}`）+ antd `Button` "添加备注"。`addComment` 直接从 `../api/client` 导入（遵循现有 `getTicketHistory` 导入模式）。提交成功后清空输入并调用 `onCommentAdded` 回调，父组件在回调中 `setRefreshKey(k => k + 1)` 触发 Timeline 刷新；API 失败时保留已输入文本并显示错误 [WF-004][WF-005]
  > Drawer 新增 `onCommentAdded?: () => void` 回调 prop，由父组件实现 refreshKey 递增逻辑
- [ ] 5.3 TicketDetailDrawer 测试新增：备注区域渲染条件（enableComments=true/false）、提交备注成功、空内容校验、API 错误保留文本 [WF-004][WF-005]

## 6. Frontend Workbench UI

- [ ] 6.1 SubmitterWorkbench：新增 "操作" 列（`fixed: 'right'`），status=submitted 时显示 antd `Button` "编辑"，点击弹出 antd `Modal` 编辑表单（title/description/priority/dueDate），确认后调用 updateTicket；API 失败时 Modal 保持打开且已输入文本不丢失，成功后关闭 Modal 并刷新列表 [WF-003]
- [ ] 6.2 SubmitterWorkbench 测试新增：编辑按钮可见性（submitted 可见/非 submitted 不可见）、Modal 表单交互、API 错误时保留文本 [WF-003]
- [ ] 6.3 DispatcherWorkbench：TicketDetailDrawer 传入 `enableComments=true`，通过 `refreshKey` 机制支持备注后 Timeline 刷新 [WF-004]
- [ ] 6.4 DispatcherWorkbench 测试新增：备注区域渲染、提交备注、空内容校验、API 错误保留文本 [WF-004]
- [ ] 6.5 CompleterWorkbench：TicketDetailDrawer 传入 `enableComments=true`，通过 `refreshKey` 机制支持备注后 Timeline 刷新 [WF-005]
- [ ] 6.6 CompleterWorkbench 测试新增：备注区域渲染、提交备注、空内容校验、API 错误保留文本 [WF-005]
