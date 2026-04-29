## 1. 调度者页面修改

- [ ] 1.1 修改 `apps/web/src/pages/DispatcherWorkbench.tsx`：过滤条件改为 `status !== 'completed'`，指派人控件改为 `<select>` 只含 `completer` 选项，assigned/in_progress 工单显示"已指派给 xxx"只读信息 [WF-004]

## 2. 测试更新（依赖 1.1）

- [ ] 2.1 更新 `apps/web/src/__tests__/workbench.test.tsx` 中调度者过滤测试：验证 submitted + assigned + in_progress 均可见，completed 不可见 [WF-004 Scenario 2]

## 3. 验证（依赖 2.1）

- [ ] 3.1 运行 `pnpm -w run check`（build + test + lint）确认全部通过 [WF-004]
