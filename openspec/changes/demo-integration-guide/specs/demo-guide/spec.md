## ADDED Requirements

### Requirement: DG-001 集成测试

`apps/server/src/__tests__/integration.test.ts` SHALL 包含完整工单流转的集成测试，通过 `app.request()` 依次执行以下操作并验证状态变迁：

1. `POST /api/tickets` 创建工单 → 验证状态为 `submitted`
2. `PATCH /api/tickets/:id/assign` 指派工单 → 验证状态为 `assigned`，`assignedTo` 为指定值
3. `PATCH /api/tickets/:id/start` 开始处理 → 验证状态为 `in_progress`
4. `PATCH /api/tickets/:id/complete` 完成 → 验证状态为 `completed`

#### Scenario: 完整流转

- **WHEN** 按顺序执行 create → assign → start → complete
- **THEN** 每步返回的工单状态 SHALL 正确变迁：`submitted` → `assigned` → `in_progress` → `completed`

#### Scenario: 集成测试数据隔离

- **WHEN** 集成测试运行
- **THEN** SHALL 在 `beforeEach` 中通过 Drizzle ORM API 清空 tickets 表数据，确保测试间互不污染

### Requirement: DG-002 演示说明

README.md SHALL 在 Demo Roadmap 区域后包含"演示步骤"章节，说明如何在 2 分钟内完成完整 Demo 流程。

#### Scenario: 新人独立演示

- **WHEN** 一个新用户按照 README 的演示步骤操作
- **THEN** SHALL 能完成：启动服务 → 提交者创建工单 → 调度者指派 → 完成者处理 → 工单状态变为 completed
