## 1. 测试 (Red)

- [x] 1.1 新增分页交互测试到 `apps/web/src/__tests__/workbench.test.tsx`：覆盖切换 pageSize 后表格行数变化、切换页码后翻页生效 [WF-003] [WF-004] [WF-005]

## 2. 实现 (Green)

- [x] 2.1 SubmitterWorkbench：增加 `useState` 分页状态 + `onChange` 回调 [WF-003]
- [x] 2.2 DispatcherWorkbench：增加 `useState` 分页状态 + `onChange` 回调 [WF-004]
- [x] 2.3 CompleterWorkbench：增加 `useState` 分页状态 + `onChange` 回调 [WF-005]

## 3. 验证

- [x] 3.1 运行 `pnpm --filter @ticketflow/web test` 确认分页相关测试通过
- [x] 3.2 运行 `pnpm check` 确认全量 build + test + lint 通过
