## 1. Shared Components [TKT-017] [TKT-018]

- [ ] 1.1 新增 `apps/web/src/components/Timeline.tsx`：接收 `events: TicketHistoryEvent[]`，使用 antd `Timeline` 渲染，action 映射中文标签，按类型区分颜色，解析 `details` JSON 显示指派信息，空数组显示 Empty [TKT-018]
- [ ] 1.2 新增 `apps/web/src/__tests__/Timeline.test.tsx`：测试正常渲染、空数组 Empty、reassigned 标签显示 [TKT-018]
- [ ] 1.3 新增 `apps/web/src/components/TicketDetailDrawer.tsx`：接收 `ticket`/`open`/`onClose`/`showTimeline` props，使用 antd Drawer + Descriptions + Timeline；getTicketHistory 失败时降级 Empty [TKT-017]
- [ ] 1.4 新增 `apps/web/src/__tests__/TicketDetailDrawer.test.tsx`：测试详情展示、Timeline 渲染、历史加载失败降级 [TKT-017]

## 2. Workbench 改造 [WF-003] [WF-004] [WF-005]

- [ ] 2.1 改造 `SubmitterWorkbench.tsx`：Table `pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100', '200'] }}`，状态列 `filters` 筛选，删除内联 Drawer 改用共享 TicketDetailDrawer [WF-003]
- [ ] 2.2 改造 `DispatcherWorkbench.tsx`：Table `pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100', '200'] }}` + 状态列 `filters`，删除内联 Drawer 改用共享组件 [WF-004]
- [ ] 2.3 改造 `CompleterWorkbench.tsx`：Table `pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100', '200'] }}` + 状态列 `filters`（选项 assigned/in_progress/completed），删除内联 Drawer 改用共享组件 [WF-005]
- [ ] 2.4 更新 `workbench.test.tsx`：验证分页器存在、状态筛选交互、Drawer 内容（含 Timeline）

## 3. Verification

- [ ] 3.1 运行 `pnpm check` 确认 build + test + lint 全绿
- [ ] 3.2 启动 dev server 手动验证：三个工作台分页正常、状态筛选正常、Drawer 含 Timeline
