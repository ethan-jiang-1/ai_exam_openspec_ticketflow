## Context

当前三个工作台（SubmitterWorkbench、DispatcherWorkbench、CompleterWorkbench）各自在页面内定义了 antd Table + Drawer，Table 使用 `pagination={false}` 全量渲染，无筛选 UI。mvp1-ticket-history 已提供 `GET /api/tickets/:id/history` API，但前端无 UI 消费。

此 change 是 MVP1 序列的第 ③ 步，依赖 ② mvp1-ticket-history（已完成）。

## Goals / Non-Goals

**Goals:**
- 三个工作台 Table 启用前端分页（pageSize=10，支持 showSizeChanger）
- 三个工作台 Table 状态列增加筛选 UI（antd column `filters`）
- 抽取共享 `TicketDetailDrawer` 组件，三个工作台统一使用，消除重复代码
- Drawer 内集成 `Timeline` 组件（基于 `getTicketHistory` API），提交者视图中展示完整处理时间线

**Non-Goals:**
- 不引入服务端分页/排序/筛选（MVP 数据量小，前端处理即可）
- 不改动后端 API
- 不引入新的 npm 依赖
- 不修改工作台的数据获取逻辑（仍为 `getTickets()` 全量拉取 + 客户端筛选）

## Decisions

### Decision 1: 前端分页 vs 服务端分页

**选择**: 使用 antd Table 内置的前端分页（`pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100', '200'] }}`）。

**理由**: MVP 阶段工单量小（< 500 条），前端分页零 API 改造成本。服务端分页留给 MVP2。

### Decision 2: 状态筛选方式

**选择**: antd Table column `filters` 属性，对每个工作台配置适用状态选项。

| 工作台 | 筛选选项 |
|--------|----------|
| 提交者 | submitted, assigned, in_progress, completed |
| 调度者 | submitted, assigned, in_progress, completed |
| 完成者 | assigned, in_progress, completed |

**理由**: antd Table 内置 `filters` + `onFilter` 无需额外 UI 组件，一行配置即可实现列头下拉筛选。

### Decision 3: 共享 TicketDetailDrawer vs 三个独立 Drawer

**选择**: 抽取为共享组件 `TicketDetailDrawer`，接受 `ticket: Ticket | null` + `open: boolean` + `onClose` props，内部调用 `getTicketHistory` 获取历史数据，渲染 `Descriptions` + `Timeline`。

**替代方案**: 保留三个独立 Drawer，分别加入 Timeline。

**理由**: 三个工作台的 Drawer 展示内容 90% 相同（状态/创建者/指派给/创建时间/描述），仅 Timeline 是否需要显示略有差异。共享组件一处修改三处生效，且符合 DRY 原则。通过 props（如 `showTimeline?: boolean`）控制 Timeline 显隐。

### Decision 4: Timeline 组件实现

**选择**: 使用 antd `Timeline` 组件，items 由 `getTicketHistory(ticketId)` 返回的 `TicketHistoryEvent[]` 映射而来。每个 item 显示 action 中文标签、actor、时间戳。颜色按 action 类型区分：created=blue, assigned/reassigned=gold, started=orange, completed=green。

```
const ACTION_LABELS: Record<string, string> = {
  created: '创建工单',
  assigned: '指派',
  reassigned: '改派',
  started: '开始处理',
  completed: '完成',
}
```

### Decision 5: 组件文件布局

**选择**: Timeline 独立为一个文件，TicketDetailDrawer 独立为一个文件。

```
apps/web/src/components/
├── Layout.tsx
├── Timeline.tsx              # 新增: 纯展示组件，接收 TicketHistoryEvent[]
└── TicketDetailDrawer.tsx    # 新增: 抽屉容器，含 Descriptions + Timeline
```

**理由**: Timeline 单一职责——纯展示组件，方便独立测试和复用（Dashboard 未来可能复用）。

## Risks / Trade-offs

- **Risk**: `getTicketHistory` API 失败时 Timeline 显示空白 → **Mitigation**: 用 try/catch 包裹，失败时显示 antd Empty 提示"无法加载处理历史"
- **Trade-off**: 前端分页在工单量增长到 500+ 时可能影响首屏渲染 → 可接受，MVP2 计划引入服务端分页

## Open Questions

1. 调度者和完成者也需要看到 Timeline 吗？还是仅提交者？当前设计 Timeline 在三个工作台 Drawer 均可显示（数据来源是 `ticket.id` 通用接口），但可加 `showTimeline` prop 控制。
2. ~~分页 pageSize 默认 20 是否合适？~~ 已确定：默认 10，选项 10/20/50/100/200，通过 `showSizeChanger` 支持
