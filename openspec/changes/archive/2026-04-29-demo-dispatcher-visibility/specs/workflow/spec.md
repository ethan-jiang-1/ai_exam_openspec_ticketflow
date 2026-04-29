## MODIFIED Requirements

### Requirement: WF-004 调度者工作台（修改）

`/workbench/dispatcher` SHALL 显示所有未完成状态的工单（通过 `getTickets()` 获取全部后在客户端按 `status !== 'completed'` 过滤）。

- `submitted` 状态的工单：显示指派操作（select 下拉选择指派人，选项为 `completer`）
- `assigned` 状态的工单：显示"已指派给 {assignedTo}"，无操作按钮
- `in_progress` 状态的工单：显示"处理中（已指派给 {assignedTo}）"，无操作按钮

#### Scenario: 指派工单（不变）

- **WHEN** 调度者看到一条 submitted 工单，在指派人下拉框选择 "completer"，点击指派
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/assign`，body 为 `{ assignedTo: "completer" }`，成功后列表 SHALL 刷新

#### Scenario: 已指派工单仍可见

- **WHEN** 调度者视图中有 1 条 submitted 工单和 1 条 assigned 工单
- **THEN** 调度者 SHALL 看到 2 条工单，assigned 的工单 SHALL 显示"已指派给 xxx"且无指派操作

#### Scenario: 无待处理工单（修改）

- **WHEN** 所有工单都是 completed 状态
- **THEN** 页面 SHALL 显示"暂无待处理的工单"提示

#### Scenario: 指派人只能选择 completer

- **WHEN** 调度者查看指派人控件
- **THEN** 控件 SHALL 为 `<select>` 下拉框，选项 SHALL 只包含 `completer`

#### Scenario: API 调用失败时显示错误（不变）

- **WHEN** 指派或获取工单列表时后端返回错误
- **THEN** 页面 SHALL 显示错误提示信息（非白屏）
