## Why

调度者工作台只显示 `status === 'submitted'` 的工单，一旦指派完工单就从调度者眼前消失。如果指派给了一个不存在的人（自由文本输入框可填任意字符串），那条工单就没人能操作——调度者看不到，完成者也看不到，工单在系统中"死亡"。Demo 必须让用户体验到一个逻辑正常的流转。

## What Changes

- 调度者工作台的过滤条件从 `status === 'submitted'` 改为 `status !== 'completed'`（显示 submitted + assigned + in_progress）
- 已指派的工单在调度者视图中显示"已指派给 xxx"状态，submitted 的工单才显示指派操作
- 指派人输入框改为 `<select>` 下拉选择，选项只有 `completer`（系统里唯一的执行角色）
- 更新调度者工作台相关测试

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `workflow`: 修改 WF-004 调度者工作台过滤条件和指派控件

## Impact

- `apps/web/src/pages/DispatcherWorkbench.tsx` — 过滤条件 + 指派人控件改为 select
- `apps/web/src/__tests__/workbench.test.tsx` — 更新调度者过滤测试

## Success Criteria

- 调度者能看到 submitted、assigned、in_progress 三种状态的工单
- 指派后工单仍在调度者视图中，显示已指派信息
- 指派人只能选择 completer，无法输入无效值
- `pnpm -w run check` 全部通过
