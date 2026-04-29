## Context

调度者工作台（change ③）当前只显示 `status === 'submitted'` 的工单。指派后工单状态变为 `assigned`，从调度者视图中消失。指派人使用自由文本 `<input>` 输入，可填任意值，导致工单可能被指派给不存在的人。

## Goals / Non-Goals

**Goals:**
- 调度者能看到管线中所有未完成的工单
- 指派人只能选择有效的执行角色
- Demo 流程体验逻辑正常

**Non-Goals:**
- 不做真实的用户选择 / 权限系统
- 不改后端 API（指派人存字符串不变）
- 不改提交者和完成者工作台

## Decisions

### D1: 调度者显示所有未完成工单

过滤条件从 `status === 'submitted'` 改为 `status !== 'completed'`。submitted 的工单显示指派操作，assigned/in_progress 的工单显示只读的"已指派给 xxx"信息。

**理由**: 调度者的职责是管理流转，需要全局视野。completed 的工单不需要显示（已完成，无需关注）。

### D2: 指派人改为 select 下拉

将 `<input type="text">` 改为 `<select>`，选项固定为 `completer`。只有一个选项是因为 Demo 系统里只有一个执行角色。

**理由**: 消除自由文本导致的无效指派，保证 Demo 流程可走通。

## Directory Layout

```
apps/web/src/
├── pages/
│   └── DispatcherWorkbench.tsx       # 修改：过滤条件 + select 控件
└── __tests__/
    └── workbench.test.tsx            # 修改：更新调度者过滤断言
```

## Risks / Trade-offs

- **[Trade-off] select 只有一个选项看起来有点奇怪** → Demo 阶段可接受，暗示未来会有多用户
- **[Risk] 调度者看到已指派工单但没有操作** → 显示"已指派给 xxx"提供信息，不提供重新指派（Demo 简化）

## Open Questions

1. **assigned/in_progress 的工单是否需要操作按钮？** — 假设不需要，只显示状态信息。重新指派留给 MVP。
2. **completed 工单要不要在调度者视图中显示？** — 假设不显示，保持视图聚焦于待处理工单。
