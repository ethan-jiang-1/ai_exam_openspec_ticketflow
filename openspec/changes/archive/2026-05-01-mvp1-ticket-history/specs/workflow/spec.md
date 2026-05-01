## MODIFIED Requirements

### Requirement: WF-004 调度者工作台

`/workbench/dispatcher` SHALL 显示所有未完成状态的工单（通过 `getTickets()` 获取全部后在客户端按 `status !== 'completed'` 过滤），使用 antd `Table`（`pagination={false}`、`scroll={{ x: 'max-content' }}`）展示。标题列 SHALL 为可点击链接（`ellipsis: true`），点击后 SHALL 弹出 antd `Drawer`（宽度 480px）显示工单详情，使用 antd `Descriptions`（`column={1}`、`bordered`、`size="small"`）展示状态（Tag + 中文标签）、创建者、指派给、创建时间、描述。"创建者"和"创建时间"列 SHALL 设置 `responsive: ['lg']`。

- `submitted` 状态的工单：操作列显示 antd `Select`（选项为 `completer`）和 antd `Button` "指派"
- `assigned` 状态的工单：操作列显示 antd `Select`（选项为 `completer`，默认值为当前 `assignedTo`）和 antd `Button` "重新指派"。若选择与当前 `assignedTo` 相同的用户并点击按钮，SHALL 显示错误提示 "工单已指派给该用户"
- `in_progress` 状态的工单：操作列显示文本 "处理中（已指派给 {assignedTo}）"，无操作按钮

#### Scenario: 指派工单

- **WHEN** 调度者看到一条 submitted 工单，在 antd `Select` 中选择 "completer"，点击指派 Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/assign`，body 为 `{ assignedTo: "completer" }`，成功后列表 SHALL 刷新

#### Scenario: 重新指派工单

- **WHEN** 调度者看到一条 assigned 工单（assignedTo 为 `completer`），在 antd `Select` 中选择 `completer2`，点击 "重新指派" Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/assign`，body 为 `{ assignedTo: "completer2" }`，成功后列表 SHALL 刷新，工单 assignedTo 变为 `completer2`

#### Scenario: 重新指派给相同用户显示错误

- **WHEN** 调度者看到一条 assigned 工单（assignedTo 为 `completer`），在 antd `Select` 中未改变选择（仍为 `completer`），点击 "重新指派" Button
- **THEN** SHALL 显示错误提示 "工单已指派给该用户"，不刷新列表

#### Scenario: 已指派工单仍可见

- **WHEN** 调度者视图中有 1 条 submitted 工单和 1 条 assigned 工单
- **THEN** 调度者 SHALL 在 antd Table 中看到 2 条工单，assigned 的工单操作列 SHALL 显示重新指派 Select + Button

#### Scenario: 无待处理工单

- **WHEN** 所有工单都是 completed 状态
- **THEN** antd Table SHALL 显示 antd `Empty` 组件，描述为 "暂无待处理的工单"

#### Scenario: 指派人只能选择 completer

- **WHEN** 调度者查看 antd `Select` 控件
- **THEN** 控件选项 SHALL 只包含 `completer`

#### Scenario: API 调用失败时显示错误

- **WHEN** 指派或获取工单列表时后端返回错误
- **THEN** SHALL 通过 `AntdApp.useApp()` hook 获取的 `message` 实例显示错误提示信息，页面不白屏

#### Scenario: 点击标题弹出 Drawer 查看详情

- **WHEN** 调度者在工单列表中点击某条工单的标题
- **THEN** SHALL 弹出 antd Drawer，使用 Descriptions 展示该工单的状态（Tag）、创建者、指派给、创建时间、描述
