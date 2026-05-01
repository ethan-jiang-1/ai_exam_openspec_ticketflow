## MODIFIED Requirements

### Requirement: WF-003 提交者工作台

`/workbench/submitter` SHALL 显示提交者工作台，包含：antd `Form` 创建工单表单（居中布局 `maxWidth: 480px`，`Form.Item` + `Input` 标题（`maxLength={200}`、`showCount`、`rules: [{ required: true }, { max: 200 }]`）+ `Input.TextArea` 描述（`maxLength={2000}`、`showCount`、`rules: [{ max: 2000 }]`）+ `Form.Item` + `Select` 优先级（选项 low/medium/high，`initialValue="medium"`）+ `Form.Item` + `DatePicker` 截止日期 + antd `Button` 提交按钮）和 antd `Table` 工单列表（`pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['5', '10', '20', '50', '100', '200'] }}`，"创建时间"列 `responsive: ['lg']`）。状态列 SHALL 配置 antd Table column `filters`，选项为 submitted / assigned / in_progress / completed（使用 `STATUS_LABELS` 中文映射），`filterSearch: false`，`onFilter` 通过 status 值匹配。创建工单时 SHALL 调用 `createTicket({ title, description, priority, dueDate })`，不传 `createdBy`（后端从 auth context 获取）。工单列表 SHALL 仅显示 `createdBy === user.username` 的工单（通过 `getTickets()` 获取全部后在客户端过滤）。标题列 SHALL 为可点击链接（`ellipsis: true`），点击后 SHALL 弹出共享 `TicketDetailDrawer` 组件（接收 `ticket`、`open`、`onClose`、`showTimeline=true` props），展示工单详情和处理时间线。

工单列表 SHALL 新增操作列（`fixed: 'right'`），对于 status=`submitted` 的工单显示 antd `Button` "编辑"，点击后弹出 antd `Modal` 编辑表单，包含以下可编辑字段：
- `Form.Item` + `Input` 标题（`maxLength={200}`、`showCount`、`rules: [{ required: true }, { max: 200 }]`）
- `Form.Item` + `Input.TextArea` 描述（`maxLength={2000}`、`showCount`、`rules: [{ max: 2000 }]`）
- `Form.Item` + `Select` 优先级（选项 low/medium/high）
- `Form.Item` + `DatePicker` 截止日期

Modal 确认后 SHALL 调用 `PATCH /api/tickets/:id`，body 包含所有变更字段。成功后 SHALL 关闭 Modal 并刷新列表。

#### Scenario: 创建工单不传 createdBy

- **WHEN** submitter 用户在 antd Form 中填写 title 和 description，点击提交
- **THEN** SHALL 调用 `POST /api/tickets`，body 包含 `{ title, description, priority, dueDate }`，不包含 `createdBy`。后端 SHALL 从 auth context 自动填充 `createdBy`

#### Scenario: 工单列表仅显示自己创建的

- **WHEN** `getTickets()` 返回 4 条工单，其中 2 条 `createdBy` 为当前用户 username，2 条为其他用户
- **THEN** antd Table SHALL 仅显示 2 条属于当前用户的工单

#### Scenario: title 为空时表单验证拦截

- **WHEN** title 输入框为空，用户尝试提交
- **THEN** antd Form SHALL 显示必填验证提示，不发送 API 请求

#### Scenario: API 调用失败时显示错误

- **WHEN** 创建工单或获取工单列表时后端返回错误
- **THEN** SHALL 通过 `AntdApp.useApp()` hook 获取的 `message` 实例显示错误提示信息，页面不白屏

#### Scenario: 点击标题弹出 Drawer 查看详情和时间线

- **WHEN** 提交者在工单列表中点击某条工单的标题
- **THEN** SHALL 弹出共享 TicketDetailDrawer，使用 Descriptions 展示该工单的状态（Tag）、创建者、指派给、优先级（Tag）、截止日期、创建时间、描述，并使用 antd Timeline 展示该工单的完整处理历史

#### Scenario: Table 分页显示

- **WHEN** 提交者有 25 条工单
- **THEN** antd Table SHALL 默认显示第 1 页（10 条），底部显示分页器，可切换每页条数

#### Scenario: 状态列筛选

- **WHEN** 提交者在工单列表的状态列标题点击筛选下拉，选择 "已指派"
- **THEN** antd Table SHALL 仅显示 `status === 'assigned'` 的工单

#### Scenario: submitted 工单可编辑

- **WHEN** 提交者看到一条 status=`submitted` 的工单，点击 "编辑" 按钮，在 Modal 中修改标题为新值，点击确认
- **THEN** SHALL 调用 `PATCH /api/tickets/:id`，body 包含 `{ title: "新值" }`，成功后 SHALL 关闭 Modal 并刷新列表

#### Scenario: 编辑 API 失败时保留已输入内容

- **WHEN** 提交者在编辑 Modal 中修改了标题，但 `PATCH /api/tickets/:id` 返回错误
- **THEN** Modal SHALL 保持打开状态，已输入的文本不被清空，并显示 API 错误提示

### Requirement: WF-004 调度者工作台

`/workbench/dispatcher` SHALL 显示所有未完成状态的工单（通过 `getTickets()` 获取全部后在客户端按 `status !== 'completed'` 过滤），使用 antd `Table`（`pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['5', '10', '20', '50', '100', '200'] }}`、`scroll={{ x: 'max-content' }}`）展示。状态列 SHALL 配置 antd Table column `filters`，选项为 submitted / assigned / in_progress / completed（使用 `STATUS_LABELS` 中文映射），`filterSearch: false`，`onFilter` 通过 status 值匹配。标题列 SHALL 为可点击链接（`ellipsis: true`），点击后 SHALL 弹出共享 `TicketDetailDrawer` 组件（接收 `ticket`、`open`、`onClose`、`showTimeline=true` props），展示工单详情和处理时间线。"创建者"和"创建时间"列 SHALL 设置 `responsive: ['lg']`。

- `submitted` 状态的工单：操作列显示 antd `Select`（选项为 completer 角色用户）和 antd `Button` "指派"
- `assigned` 状态的工单：操作列显示 antd `Select`（选项为 completer 角色用户）和 antd `Button` "改派"
- `in_progress` 状态的工单：操作列显示文本 "处理中（已指派给 {assignedTo}）"，无操作按钮

工单详情 Drawer 底部 SHALL 包含备注区域：antd `Input.TextArea`（`maxLength={2000}`、`showCount`、`rows={3}`）+ antd `Button` "添加备注"。提交后 SHALL 调用 `POST /api/tickets/:id/comments`，成功后清空输入并刷新 Timeline。

#### Scenario: 指派工单

- **WHEN** 调度者看到一条 submitted 工单，在 antd `Select` 中选择 completer 用户，点击指派 Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/assign`，body 为 `{ assignedTo: "<username>" }`，成功后列表 SHALL 刷新

#### Scenario: 改派工单

- **WHEN** 调度者看到一条 assigned 工单，在 antd `Select` 中选择不同的 completer 用户，点击改派 Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/assign`，body 为 `{ assignedTo: "<username>" }`，成功后列表 SHALL 刷新

#### Scenario: 已指派工单仍可见

- **WHEN** 调度者视图中有 1 条 submitted 工单和 1 条 assigned 工单
- **THEN** 调度者 SHALL 在 antd Table 中看到 2 条工单

#### Scenario: 无待处理工单

- **WHEN** 所有工单都是 completed 状态
- **THEN** antd Table SHALL 显示 antd `Empty` 组件，描述为 "暂无待处理的工单"

#### Scenario: 指派人只能选择 completer

- **WHEN** 调度者查看 antd `Select` 控件
- **THEN** 控件选项 SHALL 只包含 role 为 completer 的用户

#### Scenario: API 调用失败时显示错误

- **WHEN** 指派或获取工单列表时后端返回错误
- **THEN** SHALL 通过 `AntdApp.useApp()` hook 获取的 `message` 实例显示错误提示信息，页面不白屏

#### Scenario: 点击标题弹出 Drawer 查看详情和时间线

- **WHEN** 调度者在工单列表中点击某条工单的标题
- **THEN** SHALL 弹出共享 TicketDetailDrawer，使用 Descriptions 展示该工单的状态（Tag）、创建者、指派给、优先级（Tag）、截止日期、创建时间、描述，并使用 antd Timeline 展示该工单的完整处理历史

#### Scenario: Table 分页显示

- **WHEN** 调度者有 25 条未完成工单
- **THEN** antd Table SHALL 默认显示第 1 页（10 条），底部显示分页器

#### Scenario: 状态列筛选

- **WHEN** 调度者在工单列表的状态列标题点击筛选下拉，选择 "已提交"
- **THEN** antd Table SHALL 仅显示 `status === 'submitted'` 的工单

#### Scenario: 添加备注

- **WHEN** 调度者在工单详情 Drawer 的备注区域输入文本 "需要紧急处理"，点击 "添加备注"
- **THEN** SHALL 调用 `POST /api/tickets/:id/comments`，body 为 `{ "comment": "需要紧急处理" }`，成功后清空输入并刷新 Timeline

#### Scenario: 备注 API 失败时保留已输入内容

- **WHEN** 调度者在备注区域输入文本后提交，但 `POST /api/tickets/:id/comments` 返回错误
- **THEN** 备注输入框中已输入的文本不被清空，并显示 API 错误提示

### Requirement: WF-005 完成者工作台

`/workbench/completer` SHALL 显示所有 `assignedTo === user.username` 且状态为 `assigned` 或 `in_progress` 的工单（通过 `getTickets()` 获取全部后在客户端过滤），使用 antd `Table`（`pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['5', '10', '20', '50', '100', '200'] }}`、`scroll={{ x: 'max-content' }}`）展示。状态列 SHALL 配置 antd Table column `filters`，选项为 assigned / in_progress / completed（使用 `STATUS_LABELS` 中文映射），`filterSearch: false`，`onFilter` 通过 status 值匹配。标题列 SHALL 为可点击链接（`ellipsis: true`），点击后 SHALL 弹出共享 `TicketDetailDrawer` 组件（接收 `ticket`、`open`、`onClose`、`showTimeline=true` props），展示工单详情和处理时间线。`assigned` 状态的工单操作列有 antd `Button` "开始处理"，`in_progress` 状态的工单操作列有 antd `Button` "完成"。"创建者"和"创建时间"列 SHALL 设置 `responsive: ['lg']`。

工单详情 Drawer 底部 SHALL 包含备注区域：antd `Input.TextArea`（`maxLength={2000}`、`showCount`、`rows={3}`）+ antd `Button` "添加备注"。提交后 SHALL 调用 `POST /api/tickets/:id/comments`，成功后清空输入并刷新 Timeline。

#### Scenario: 开始处理工单

- **WHEN** 完成者看到一条 assigned 且 assignedTo 为自己的工单，点击 "开始处理" Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/start`，成功后列表 SHALL 刷新，工单状态变为 `in_progress`

#### Scenario: 完成工单

- **WHEN** 完成者看到一条 in_progress 且 assignedTo 为自己的工单，点击 "完成" Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/complete`，成功后列表 SHALL 刷新，工单状态变为 `completed`

#### Scenario: 不显示非自己的工单

- **WHEN** 有一条 assigned 工单，assignedTo 为 "other_person"
- **THEN** 该工单 SHALL 不出现在 antd Table 中

#### Scenario: API 调用失败时显示错误

- **WHEN** 开始处理、完成或获取工单列表时后端返回错误
- **THEN** SHALL 通过 `AntdApp.useApp()` hook 获取的 `message` 实例显示错误提示信息，页面不白屏

#### Scenario: 点击标题弹出 Drawer 查看详情和时间线

- **WHEN** 完成者在工单列表中点击某条工单的标题
- **THEN** SHALL 弹出共享 TicketDetailDrawer，使用 Descriptions 展示该工单的状态（Tag）、创建者、指派给、优先级（Tag）、截止日期、创建时间、描述，并使用 antd Timeline 展示该工单的完整处理历史

#### Scenario: Table 分页显示

- **WHEN** 完成者有 25 条待处理工单
- **THEN** antd Table SHALL 默认显示第 1 页（10 条），底部显示分页器

#### Scenario: 状态列筛选

- **WHEN** 完成者在工单列表的状态列标题点击筛选下拉，选择 "处理中"
- **THEN** antd Table SHALL 仅显示 `status === 'in_progress'` 的工单

#### Scenario: 添加备注

- **WHEN** 完成者在工单详情 Drawer 的备注区域输入文本 "问题已定位，正在修复"，点击 "添加备注"
- **THEN** SHALL 调用 `POST /api/tickets/:id/comments`，body 为 `{ "comment": "问题已定位，正在修复" }`，成功后清空输入并刷新 Timeline

#### Scenario: 备注 API 失败时保留已输入内容

- **WHEN** 完成者在备注区域输入文本后提交，但 `POST /api/tickets/:id/comments` 返回错误
- **THEN** 备注输入框中已输入的文本不被清空，并显示 API 错误提示
