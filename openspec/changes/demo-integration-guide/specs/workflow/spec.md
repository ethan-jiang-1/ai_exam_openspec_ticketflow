## ADDED Requirements

### Requirement: WF-009 Status badge 样式

工单列表中的状态字段 SHALL 显示为带颜色的 badge（圆角背景标签），不同状态使用不同颜色：
- `submitted` → 蓝色背景
- `assigned` → 黄色背景
- `in_progress` → 橙色背景
- `completed` → 绿色背景

#### Scenario: 状态显示为 badge

- **WHEN** 工单列表中有状态为 `submitted` 的工单
- **THEN** 状态列 SHALL 显示为蓝色背景的 `submitted` 文本标签

### Requirement: WF-010 时间格式化

工单列表中的时间字段（`createdAt`、`updatedAt`）SHALL 使用 `Date.toLocaleString()` 格式化为本地化时间字符串，不再显示 ISO 8601 原始格式。

#### Scenario: 时间本地化显示

- **WHEN** 工单的 `createdAt` 为 `2026-01-15T08:30:00.000Z`
- **THEN** 页面 SHALL 显示格式化后的本地时间（如 `2026/1/15 08:30:00`），SHALL NOT 显示原始 ISO 字符串
