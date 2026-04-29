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
