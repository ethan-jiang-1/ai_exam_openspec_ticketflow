## Why

三个工作台（SubmitterWorkbench、DispatcherWorkbench、CompleterWorkbench）的 antd Table 分页组件中，用户通过 `showSizeChanger` 下拉框切换每页条数后，表格不响应，始终维持在默认的 10 条/页。根因是 `pagination` 以无状态的内联对象方式传入，每次组件 re-render 都将 `pageSize` 重置为硬编码的 `10`，且缺少 `onChange` 回调来持久化用户的选择。

## What Changes

- 三个工作台 Table 组件增加 `useState` 管理分页状态（`current`/`pageSize`），`pagination` prop 合并动态状态
- Table 增加 `onChange` 回调，在用户切换页码或每页条数时更新分页状态
- 保证 `showSizeChanger` + `pageSizeOptions` 的用户交互与表格渲染一致

## Capabilities

### New Capabilities
<!-- None — this is a pure bug fix to existing behavior -->
### Modified Capabilities
- `workflow`: WF-003/004/005 中 Table pagination 行为修正——pageSize 选择器实际生效

## Impact

- `apps/web/src/pages/SubmitterWorkbench.tsx` — 增加 pagination state + onChange
- `apps/web/src/pages/DispatcherWorkbench.tsx` — 同上
- `apps/web/src/pages/CompleterWorkbench.tsx` — 同上
- `apps/web/src/__tests__/workbench.test.tsx` — 新增分页交互测试（切换 pageSize 后表格行数变化）
