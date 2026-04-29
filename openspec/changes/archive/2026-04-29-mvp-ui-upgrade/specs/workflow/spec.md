## MODIFIED Requirements

### Requirement: WF-001 角色选择页

`/` 路由 SHALL 显示角色选择页，包含三个可选角色（submitter / dispatcher / completer），使用 antd `Card` 组件（`hoverable` 属性）展示角色选项。用户点击 Card 后 SHALL 将角色存入 `localStorage`（key: `ticketflow-role`）并跳转到对应工作台 `/workbench/:role`。Card 使用 antd `Row` / `Col` 布局，居中排列。

#### Scenario: 选择角色后跳转

- **WHEN** 用户在角色选择页点击 "提交者" Card
- **THEN** `localStorage` 中 `ticketflow-role` SHALL 为 `"submitter"`，页面 SHALL 跳转到 `/workbench/submitter`

#### Scenario: 已有角色时直接跳转

- **WHEN** 用户访问 `/`，且 `localStorage` 中已有 `ticketflow-role` 为 `"dispatcher"`
- **THEN** 页面 SHALL 自动跳转到 `/workbench/dispatcher`

#### Scenario: 角色值无效时留在选择页

- **WHEN** 用户访问 `/`，且 `localStorage` 中 `ticketflow-role` 为 `"invalid_role"`
- **THEN** 页面 SHALL 停留在角色选择页（不跳转）

#### Scenario: Card 展示三个角色

- **WHEN** 用户访问角色选择页
- **THEN** 页面 SHALL 显示 3 个 antd Card，标题分别为 "提交者"、"调度者"、"完成者"，Card SHALL 有 hoverable 效果

### Requirement: WF-002 共享 Layout

所有 `/workbench/*` 路由 SHALL 使用 antd `Layout` 组件（`Layout` + `Layout.Header` + `Layout.Content`）构建页面骨架。Header 顶部 SHALL 显示当前角色名称和 antd `Button` "切换角色"按钮。

#### Scenario: 显示当前角色

- **WHEN** 用户以 submitter 角色进入工作台
- **THEN** Layout Header SHALL 显示 "当前角色：提交者" 文本

#### Scenario: 切换角色

- **WHEN** 用户点击 antd `Button` "切换角色"
- **THEN** 页面 SHALL 跳转回 `/`（角色选择页），`localStorage` 中的角色值 SHALL 被清除

### Requirement: WF-003 提交者工作台

`/workbench/submitter` SHALL 显示提交者工作台，包含：antd `Form` 创建工单表单（居中布局 `maxWidth: 480px`，`Form.Item` + `Input` 标题（`maxLength={200}`、`showCount`、`rules: [{ required: true }, { max: 200 }]`）+ `Input.TextArea` 描述（`maxLength={2000}`、`showCount`、`rules: [{ max: 2000 }]`）+ antd `Button` 提交按钮）和 antd `Table` 工单列表（`pagination={false}`，"创建时间"列 `responsive: ['lg']`）。工单列表 SHALL 仅显示 `createdBy === "submitter"` 的工单（通过 `getTickets()` 获取全部后在客户端过滤）。标题列 SHALL 为可点击链接（`ellipsis: true`），点击后 SHALL 弹出 antd `Drawer`（宽度 480px）显示工单详情，使用 antd `Descriptions`（`column={1}`、`bordered`、`size="small"`）展示状态（Tag + 中文标签）、创建者、指派给、创建时间、描述。

#### Scenario: 创建工单

- **WHEN** 用户在 antd Form 中填写 title 为 "Fix login" 和 description 为 "Safari 上无法登录"，点击提交
- **THEN** SHALL 调用 `POST /api/tickets`，body 为 `{ title: "Fix login", description: "Safari 上无法登录", createdBy: "submitter" }`，成功后工单列表 SHALL 刷新显示新工单

#### Scenario: 工单列表仅显示自己创建的

- **WHEN** `getTickets()` 返回 4 条工单，其中 2 条 `createdBy` 为 `"submitter"`，2 条为 `"dispatcher"`
- **THEN** antd Table SHALL 仅显示 2 条 `createdBy === "submitter"` 的工单

#### Scenario: title 为空时提交按钮禁用或表单验证拦截

- **WHEN** title 输入框为空，用户尝试提交
- **THEN** antd Form SHALL 显示必填验证提示，不发送 API 请求

#### Scenario: 超长 title/description 前端校验拦截

- **WHEN** 用户输入 title 超过 200 字符或 description 超过 2000 字符并提交
- **THEN** antd Form SHALL 显示字数超限验证提示，Input/TextArea 的 `maxLength` SHALL 阻止继续输入

#### Scenario: API 调用失败时显示错误

- **WHEN** 创建工单或获取工单列表时后端返回错误
- **THEN** SHALL 通过 `AntdApp.useApp()` hook 获取的 `message` 实例显示错误提示信息，页面不白屏

#### Scenario: 点击标题弹出 Drawer 查看详情

- **WHEN** 提交者在工单列表中点击某条工单的标题
- **THEN** SHALL 弹出 antd Drawer，使用 Descriptions 展示该工单的状态（Tag）、创建者、指派给、创建时间、描述

### Requirement: WF-004 调度者工作台

`/workbench/dispatcher` SHALL 显示所有未完成状态的工单（通过 `getTickets()` 获取全部后在客户端按 `status !== 'completed'` 过滤），使用 antd `Table`（`pagination={false}`、`scroll={{ x: 'max-content' }}`）展示。标题列 SHALL 为可点击链接（`ellipsis: true`），点击后 SHALL 弹出 antd `Drawer`（宽度 480px）显示工单详情，使用 antd `Descriptions`（`column={1}`、`bordered`、`size="small"`）展示状态（Tag + 中文标签）、创建者、指派给、创建时间、描述。"创建者"和"创建时间"列 SHALL 设置 `responsive: ['lg']`。

- `submitted` 状态的工单：操作列显示 antd `Select`（选项为 `completer`）和 antd `Button` "指派"
- `assigned` 状态的工单：操作列显示文本 "已指派给 {assignedTo}"，无操作按钮
- `in_progress` 状态的工单：操作列显示文本 "处理中（已指派给 {assignedTo}）"，无操作按钮

#### Scenario: 指派工单

- **WHEN** 调度者看到一条 submitted 工单，在 antd `Select` 中选择 "completer"，点击指派 Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/assign`，body 为 `{ assignedTo: "completer" }`，成功后列表 SHALL 刷新

#### Scenario: 已指派工单仍可见

- **WHEN** 调度者视图中有 1 条 submitted 工单和 1 条 assigned 工单
- **THEN** 调度者 SHALL 在 antd Table 中看到 2 条工单，assigned 的工单操作列 SHALL 显示 "已指派给 xxx" 且无指派操作

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

### Requirement: WF-005 完成者工作台

`/workbench/completer` SHALL 显示所有 `assignedTo === "completer"` 且状态为 `assigned` 或 `in_progress` 的工单（通过 `getTickets()` 获取全部后在客户端过滤），使用 antd `Table`（`pagination={false}`、`scroll={{ x: 'max-content' }}`）展示。标题列 SHALL 为可点击链接（`ellipsis: true`），点击后 SHALL 弹出 antd `Drawer`（宽度 480px）显示工单详情，使用 antd `Descriptions`（`column={1}`、`bordered`、`size="small"`）展示状态（Tag + 中文标签）、创建者、指派给、创建时间、描述。`assigned` 状态的工单操作列有 antd `Button` "开始处理"，`in_progress` 状态的工单操作列有 antd `Button` "完成"。"创建者"和"创建时间"列 SHALL 设置 `responsive: ['lg']`。

#### Scenario: 开始处理工单

- **WHEN** 完成者看到一条 assigned 且 assignedTo 为 "completer" 的工单，点击 "开始处理" Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/start`，成功后列表 SHALL 刷新，工单状态变为 `in_progress`

#### Scenario: 完成工单

- **WHEN** 完成者看到一条 in_progress 的工单，点击 "完成" Button
- **THEN** SHALL 调用 `PATCH /api/tickets/:id/complete`，成功后列表 SHALL 刷新，工单状态变为 `completed`

#### Scenario: 不显示非自己的工单

- **WHEN** 有一条 assigned 工单，assignedTo 为 "other_person"
- **THEN** 该工单 SHALL 不出现在 antd Table 中

#### Scenario: API 调用失败时显示错误

- **WHEN** 开始处理、完成或获取工单列表时后端返回错误
- **THEN** SHALL 通过 `AntdApp.useApp()` hook 获取的 `message` 实例显示错误提示信息，页面不白屏

#### Scenario: 点击标题弹出 Drawer 查看详情

- **WHEN** 完成者在工单列表中点击某条工单的标题
- **THEN** SHALL 弹出 antd Drawer，使用 Descriptions 展示该工单的状态（Tag）、创建者、指派给、创建时间、描述

### Requirement: WF-009 Status badge 样式

工单列表中的状态字段 SHALL 使用 antd `Tag` 组件显示，不同状态使用不同 `color` 属性：
- `submitted` → `color="blue"`
- `assigned` → `color="gold"`
- `in_progress` → `color="orange"`
- `completed` → `color="green"`

#### Scenario: 状态显示为 antd Tag

- **WHEN** antd Table 中有状态为 `submitted` 的工单
- **THEN** 状态列 SHALL 渲染为 `<Tag color="blue">submitted</Tag>`

#### Scenario: 所有状态颜色正确

- **WHEN** antd Table 中有 4 条工单，状态分别为 submitted / assigned / in_progress / completed
- **THEN** 状态列 SHALL 分别渲染为 `color="blue"` / `color="gold"` / `color="orange"` / `color="green"` 的 Tag
