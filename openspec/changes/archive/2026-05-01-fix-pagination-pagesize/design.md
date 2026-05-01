## Context

三个工作台（SubmitterWorkbench、DispatcherWorkbench、CompleterWorkbench）的 antd Table 当前以无状态内联对象方式传入 `pagination` prop：

```tsx
<Table pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [...] }} />
```

antd Table 的 `pagination` 在受控模式下需要 `current` + `pageSize` 均由父组件管理，否则每次 re-render（如 `fetchTickets` 触发的 setState）都会将 `pageSize` 重置为默认值 `10`。当前缺少 `onChange` 回调来将用户的分页操作持久化到组件 state 中，导致 `showSizeChanger` 下拉框切换后表格不响应。

## Goals / Non-Goals

**Goals:**
- 三个工作台 Table 的 `showSizeChanger` 下拉切换每页条数后表格实际响应
- 用户切换页码后翻页生效
- `pageSize` 切换后自动回到第 1 页（antd 默认行为）

**Non-Goals:**
- 不涉及服务端分页（数据量小，客户端分页足够）
- 不修改 TicketDetailDrawer 或其他非 Table 分页组件
- 不引入新的 npm 依赖

## Directory Layout

```
apps/web/src/
├── pages/
│   ├── SubmitterWorkbench.tsx    # +useState pagination + onChange
│   ├── DispatcherWorkbench.tsx   # +useState pagination + onChange
│   └── CompleterWorkbench.tsx    # +useState pagination + onChange
└── __tests__/
    └── workbench.test.tsx        # +分页交互测试 (pageSize 切换 + 翻页)
```

## Decisions

### 1. 使用 `useState` 管理分页状态

每个工作台组件新增：

```tsx
const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
```

`pagination` prop 合并动态状态而非内联对象，确保 re-render 不会重置用户选择。

**Alternatives considered:**
- `useRef` 存储分页状态：ref 变更不触发 re-render，UI 无法反映更新，不可行。
- URL query params 持久化分页：过度设计，此项目无需跨导航保留分页状态。
- antd Table 非受控模式：antd v6 在同时传入 `pagination` prop 时始终为受控模式，无法退化为非受控。

### 2. 添加 `onChange` 回调

```tsx
<Table
  pagination={{ ...pagination, showSizeChanger: true, pageSizeOptions: [...] }}
  onChange={(pag) => {
    if (pag.current) setPagination(prev => ({ ...prev, current: pag.current! }))
    if (pag.pageSize) setPagination({ current: 1, pageSize: pag.pageSize! })
  }}
/>
```

- 页码变化：更新 `current`
- 每页条数变化：更新 `pageSize` 并重置 `current` 为 1（标准 UX 模式，避免切换到大 pageSize 后停留在已不存在的页码）

**Alternatives considered:**
- 使用 antd `onShowSizeChange` 已废弃 prop：antd v6 推荐统一使用 `onChange`。
- 分离 `current` 和 `pageSize` 为两个独立 `useState`：无实质收益，合并在一个对象中更简洁。

### 3. 三工作台统一实现模式

三个工作台的分页修复采用完全一致的代码模式，降低维护成本。

## Risks / Trade-offs

- **[Risk] `onChange` 中同时更新 `current` 和 `pageSize` 可能触发两次 re-render**
  → Mitigation: 合并为单次 setState 调用，React 18+ 批量更新机制会合并为一次 re-render。
- **[Risk] 筛选 + 分页组合时可能有 UX 混淆**
  → Mitigation: 这是客户端分页的通用行为（筛选缩小数据集，分页在该子集内翻页），antd Table 默认正确处理。

## Migration Plan

无迁移需求。纯前端 bug fix，部署后立即生效。无 breaking change。

## Open Questions

1. **是否需要在 localStorage 持久化用户的 pageSize 偏好？** 当前不持久化，每次刷新页面恢复默认 10 条。如果用户反馈需要记住偏好，可在后续 change 中增加。
2. **是否需要在筛选后自动重置到第 1 页？** antd Table column filter 改变后 `onChange` 的 `current` 仍为旧值，可能导致筛选结果少于当前页时的空页问题。当前依赖 antd 内置行为，如果出现问题可后续调整。
