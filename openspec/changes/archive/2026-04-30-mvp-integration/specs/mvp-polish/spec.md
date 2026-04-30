## ADDED Requirements

### Requirement: MP-001 品牌标识 — 页面标题与 Meta

`apps/web/index.html` SHALL 设置 `<title>TicketFlow - 工单流程处理工具</title>`，并包含 `<meta name="description" content="TicketFlow 工单流程处理工具 - 提交、调度、完成的全流程管理">`。`apps/web/public/favicon.svg` SHALL 替换为 TicketFlow 品牌图标（蓝底白色 "T" 字母 SVG）。

#### Scenario: 浏览器标签页显示 TicketFlow 标题

- **WHEN** 在浏览器中打开应用
- **THEN** 标签页标题 SHALL 显示 "TicketFlow - 工单流程处理工具"

#### Scenario: 页面有 meta description

- **WHEN** 查看页面 HTML 源码
- **THEN** `<head>` SHALL 包含 `<meta name="description" content="...">`

### Requirement: MP-002 品牌标识 — Layout Header

`apps/web/src/components/Layout.tsx` 的 Header SHALL 在左侧显示 "TicketFlow" 应用名（使用 `Typography.Title` level={4} 或类似样式），后跟当前用户的角色 badge（antd `Tag` 组件，按角色着色）。Header 背景色 SHALL 根据角色使用浅色背景（submitter: `#f0f5ff`、dispatcher: `#f5f0ff`、completer: `#ecfdf5`、admin: `#fff7ed`），不刺眼，素雅克制。右侧 SHALL 显示用户 displayName + "退出" 按钮。

#### Scenario: Header 显示应用名和角色

- **WHEN** submitter 用户登录后进入工作台
- **THEN** Header 左侧 SHALL 显示 "TicketFlow" 文字和蓝色的 "提交者" Tag，Header 背景色为 `#f0f5ff`
- **AND** Header 右侧 SHALL 显示 "提交者" 和 "退出" 按钮

#### Scenario: 不同角色显示不同颜色 Tag 和背景

- **WHEN** admin 用户登录后进入工作台
- **THEN** Header 左侧的角色 Tag SHALL 为琥珀色，Header 背景色为 `#fff7ed`

### Requirement: MP-003 antd 主题定制

`apps/web/src/main.tsx` 的 `ConfigProvider` SHALL 添加 `theme` prop，设置 `token.colorPrimary` 为 `#1677ff`。不新增其他 token 覆盖。

#### Scenario: ConfigProvider 包含 theme 配置

- **WHEN** 在浏览器中打开应用
- **THEN** antd 主色调 SHALL 为 `#1677ff`（antd 默认蓝）

### Requirement: MP-004 角色视觉差异化 — 登录页

`LoginPage` 中每张角色 Card SHALL 根据角色显示不同的左侧边框颜色（内联 style `borderLeft`）和 hover 阴影：

| 角色 | 边框颜色 | 阴影色 |
|------|---------|--------|
| submitter | `#5b8def` | `rgba(91, 141, 239, 0.15)` |
| dispatcher | `#7c3aed` | `rgba(124, 58, 237, 0.15)` |
| completer | `#059669` | `rgba(5, 150, 105, 0.15)` |
| admin | `#d97706` | `rgba(217, 119, 6, 0.15)` |

Card SHALL 设置 `hoverable` prop。角色名 SHALL 显示中文翻译（提交者/调度者/完成者/管理员），而非英文 key。

#### Scenario: 每张卡片有不同颜色的左边框

- **WHEN** 访问 `/login`
- **THEN** submitter 卡片左边框为蓝色，admin 卡片左边框为橙色

#### Scenario: 角色名显示中文

- **WHEN** 访问 `/login`
- **THEN** 卡片描述 SHALL 显示 "提交者"、"调度者"、"完成者"、"管理员"，不存在 "submitter"、"dispatcher" 等英文 key

#### Scenario: 卡片 hover 时显示彩色阴影

- **WHEN** 鼠标悬停在角色卡片上
- **THEN** 卡片 SHALL 显示 `boxShadow` 阴影效果

### Requirement: MP-005 工作台欢迎语与统计

每个工作台页面的 `<h2>` 标题下方 SHALL 显示问候语 "你好，{displayName}" 和一行工单统计卡片（antd `Row`/`Col` + `Card`）：

- **SubmitterWorkbench**: 我的工单总数 / 待处理（submitted）/ 处理中（assigned + in_progress）/ 已完成
- **DispatcherWorkbench**: 待指派（submitted）/ 已指派（assigned）/ 处理中（in_progress）/ 已完成
- **CompleterWorkbench**: 待处理（assigned）/ 处理中（in_progress）/ 今日完成
- **AdminWorkbench**: 用户总数 / submitter 数 / dispatcher 数 / completer 数 / admin 数

统计数据 SHALL 从当前页面已获取的数据在客户端计算得出，不增加额外 API 请求。

#### Scenario: Submitter 工作台显示统计

- **WHEN** submitter 用户进入工作台且有 3 条 submitted 工单、1 条 assigned、2 条 completed
- **THEN** 页面 SHALL 显示 "你好，提交者" 和统计卡片包含 "我的工单: 6"、"待处理: 3"、"已完成: 2"

#### Scenario: Admin 工作台显示用户统计

- **WHEN** admin 用户进入工作台
- **THEN** 页面 SHALL 显示统计卡片包含用户总数和各角色人数

### Requirement: MP-006 工单 Table 状态标签显示中文

SubmitterWorkbench、DispatcherWorkbench、CompleterWorkbench 的 Table 中 status 列 SHALL 使用 `STATUS_LABELS[status]` 渲染中文标签（已提交/已指派/处理中/已完成），而非原始英文 key。

#### Scenario: 表格中状态显示中文

- **WHEN** 工作台 Table 渲染一条 status 为 "submitted" 的工单
- **THEN** 状态列 SHALL 显示中文 "已提交" 标签，而非英文 "submitted"

#### Scenario: Drawer 状态显示中文

- **WHEN** 打开工单详情 Drawer
- **THEN** 状态字段 SHALL 显示中文标签

### Requirement: MP-007 工作台空状态

SubmitterWorkbench 和 CompleterWorkbench SHALL 在工单列表为空时显示 antd `Empty` 组件及中文提示：
- SubmitterWorkbench: `Empty description="暂无提交的工单"`
- CompleterWorkbench: `Empty description="暂无待处理的工单"`

DispatcherWorkbench 已使用 `<Empty description="暂无待处理的工单" />`，保持不变。

#### Scenario: 无工单时显示空状态

- **WHEN** submitter 用户进入工作台且无任何工单
- **THEN** 页面 SHALL 显示 "暂无提交的工单" 的空状态提示，非空白表格

### Requirement: MP-008 Admin 表格日期格式化

AdminWorkbench 的 Table 中 `createdAt` 列 SHALL 使用 `dayjs` 或原生 `toLocaleDateString('zh-CN')` 格式化为 `YYYY-MM-DD HH:mm` 格式，而非原始 ISO 8601 字符串。antd 已内置 dayjs，无需额外安装依赖。

#### Scenario: 创建时间显示为可读格式

- **WHEN** admin 工作台渲染用户列表
- **THEN** 创建时间列 SHALL 显示如 "2026-01-15 08:30" 格式，而非 "2026-01-15T08:30:00.000Z"

### Requirement: MP-009 共享 UI 常量

`packages/shared/src/ticket-types.ts` SHALL 导出以下运行时常量字典：

- `STATUS_LABELS: Record<TicketStatus, string>` — `{ submitted: '已提交', assigned: '已指派', in_progress: '处理中', completed: '已完成' }`
- `STATUS_COLORS: Record<TicketStatus, string>` — antd Tag 颜色映射
- `PRIORITY_COLORS: Record<string, string>` — antd Tag 颜色映射
- `ROLE_LABELS: Record<string, string>` — `{ submitter: '提交者', dispatcher: '调度者', completer: '完成者', admin: '管理员' }`
- `ROLE_COLORS: Record<string, string>` — `{ submitter: '#5b8def', dispatcher: '#7c3aed', completer: '#059669', admin: '#d97706' }`

`PRIORITY_LABELS` 已存在于共享包，无需新增。

三个工作台和 LoginPage SHALL 从 `@ticketflow/shared` 导入这些常量，删除本地重复定义。`packages/shared/src/index.ts` SHALL 导出所有新增常量。

#### Scenario: 常量从 shared 包导入

- **WHEN** SubmitterWorkbench 从 `@ticketflow/shared` 导入 `STATUS_LABELS`
- **THEN** `STATUS_LABELS['submitted']` SHALL 为 `'已提交'`

#### Scenario: 本地无重复定义

- **WHEN** 在三个工作台文件中搜索 `STATUS_LABELS`、`STATUS_COLORS`、`PRIORITY_COLORS` 的 const 定义
- **THEN** SHALL 不存在本地定义，均从 `@ticketflow/shared` 导入

### Requirement: MP-010 CompleterWorkbench 使用当前用户过滤

CompleterWorkbench SHALL 从 `useAuth()` hook 获取当前登录用户，使用 `user.username` 过滤工单（`t.assignedTo === user.username`），而非硬编码 `'completer'` 字符串。

#### Scenario: 不同 completer 用户看到不同工单

- **WHEN** completer 用户 "worker1" 进入工作台
- **THEN** 页面仅显示 `assignedTo === "worker1"` 的工单

### Requirement: MP-011 CompleterWorkbench Drawer 展示 dueDate

CompleterWorkbench 的工单详情 Drawer SHALL 包含 "截止日期" 字段，展示逻辑与 SubmitterWorkbench 和 DispatcherWorkbench 一致（含 overdue 红色 "已到期" Tag 和 today-due "今日到期" Tag）。

#### Scenario: Drawer 显示截止日期

- **WHEN** completer 打开一条 dueDate 为过去日期的工单详情
- **THEN** Drawer 中 SHALL 显示 "截止日期" 字段和红色 "已到期" Tag
