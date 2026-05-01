## Why

当前工单创建后内容完全不可变 — submitter 无法修正标题或描述中的错误，处理过程中也无法追加备注。`ticket_history` 表的 `details` 字段（JSON）具备记录内容变更的能力，但 `created` 事件的 `details` 为 `null`，原始内容未被保护。一旦后续支持编辑，原始数据将永久丢失。需要在"尊敬 submit 原始内容"的前提下，提供编辑审计和处理备注能力。

## What Changes

- 创建工单时在 `ticket_history.details` 中存储原始内容快照（title/description/priority/dueDate）
- 新增 `PATCH /api/tickets/:id`：submitter 在 status=`submitted` 时可编辑 title/description/priority/dueDate，每次编辑写入 `ticket_history`（action=`edited`，details 含 oldValue/newValue）
- 新增 `POST /api/tickets/:id/comments`：工单相关方可追加处理备注，写入 `ticket_history`（action=`commented`，details 含 comment）
- `TicketHistoryAction` 类型新增 `'edited'` 和 `'commented'`
- Timeline 组件渲染新增的 `edited` 和 `commented` 事件类型
- SubmitterWorkbench：`submitted` 状态工单显示"编辑"按钮，弹出编辑表单
- CompleterWorkbench/DispatcherWorkbench：处理中工单支持添加备注

## Capabilities

### New Capabilities

(none — this change extends existing ticket and workflow capabilities)

### Modified Capabilities

- `ticket`: TKT 新增编辑 API、备注 API、原始内容快照；Timeline 组件扩展 `edited`/`commented` 渲染
- `workflow`: WF-003/4/5 工作台增加编辑入口和备注入口

## Impact

| 文件 | 变更 |
|------|------|
| `packages/shared/src/ticket-types.ts` | `TicketHistoryAction` 新增 `'edited' \| 'commented'` |
| `apps/server/src/routes/tickets.ts` | `POST /api/tickets` 的 `details` 从 `null` 改为内容快照；新增 `PATCH /api/tickets/:id`（编辑字段）；新增 `POST /api/tickets/:id/comments`（备注） |
| `apps/server/src/__tests__/tickets.test.ts` | 测试原始内容快照、编辑 API、备注 API |
| `apps/web/src/components/Timeline.tsx` | 新增 `edited` 和 `commented` action 的渲染 |
| `apps/web/src/__tests__/Timeline.test.tsx` | 测试 `edited`/`commented` 渲染 |
| `apps/web/src/components/TicketDetailDrawer.tsx` | 新增可选备注区域（enableComments prop）+ refreshKey prop 支持 Timeline 刷新 |
| `apps/web/src/__tests__/TicketDetailDrawer.test.tsx` | 测试备注区域渲染、提交、错误处理 |
| `apps/web/src/pages/SubmitterWorkbench.tsx` | 新增操作列：submitted 状态工单显示编辑按钮 + Modal 编辑表单 |
| `apps/web/src/pages/DispatcherWorkbench.tsx` | 工单详情 Drawer 启用备注区域 |
| `apps/web/src/pages/CompleterWorkbench.tsx` | 工单详情 Drawer 启用备注区域 |
| `apps/web/src/__tests__/workbench.test.tsx` | 测试编辑按钮可见性/交互、备注提交/错误处理 |
| `apps/web/src/api/client.ts` | 新增 `updateTicket`、`addComment` 函数 |
| `openspec/specs/ticket/spec.md` | 新增编辑/备注/快照相关 Requirement |
| `openspec/specs/workflow/spec.md` | WF-003/4/5 新增编辑和备注相关 Scenario |
