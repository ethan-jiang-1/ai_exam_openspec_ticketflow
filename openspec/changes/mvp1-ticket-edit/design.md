## Context

当前 `ticket_history` 表仅记录状态流转（created/assigned/reassigned/started/completed），`details` JSON 字段在 `created` 事件中为 `null`，不保存原始内容快照。`tickets` 表的 title/description/priority/dueDate 字段可变，但没有编辑 API 和审计机制。一旦支持编辑，原始内容将永久丢失，无法追溯"submitter 最初提交了什么"。

此 change 是 MVP1 的扩展（原 roadmap 未包含，由 mvp1-filter-timeline 实施后的讨论驱动），依赖 ② mvp1-ticket-history（ticket_history 表已存在）。

## Goals / Non-Goals

**Goals:**
- 创建工单时在 `ticket_history.details` 中存储原始内容快照
- submitter 可在 status=`submitted` 时编辑 title/description/priority/dueDate
- 每次编辑写入 `ticket_history`（action=`edited`，details 含 field/oldValue/newValue）
- 工单相关方可追加处理备注（action=`commented`，details 含 comment）
- Timeline 组件渲染 `edited` 和 `commented` 事件

**Non-Goals:**
- 不引入独立的 `ticket_comments` 表（`ticket_history` 的 `details` JSON 已足够灵活）
- 不允许 submitter 在 status≠`submitted` 后编辑原始内容
- 不引入版本号/乐观锁（单用户编辑场景，无需冲突处理）
- 不引入新 npm 依赖
- 不改动 tickets 表结构

## Decisions

### Decision 1: 利用 ticket_history 表而非新表

**选择**: 扩展 `TicketHistoryAction` 类型（新增 `edited`/`commented`），所有变更统一写入 `ticket_history`。

**理由**: `ticket_history.details` 是 JSON 字段，天然支持异构数据（状态变更、字段编辑、备注）。新表会增加 JOIN 复杂度，且 `comments` 的查询模式（按 ticket_id + 时间排序）与 `ticket_history` 完全一致。Timeline 组件只需消费一张表的时间线数据。

### Decision 2: 原始内容保护策略

**选择**: 创建工单时在 `ticket_history` 第一个事件（action=`created`）的 `details` 中存入完整快照。

```json
{
  "title": "原始标题",
  "description": "原始描述",
  "priority": "high",
  "dueDate": "2026-06-01"
}
```

**理由**: `created` 事件是工单的"出生证明"，永不被修改。通过 `ticket_history WHERE action='created'` 即可随时还原原始内容，无需额外表或列。

### Decision 3: 编辑权限模型

| 角色 | 可编辑字段 | 条件 |
|------|-----------|------|
| submitter | title, description, priority, dueDate | status = `submitted` |
| 其他角色 | 不可编辑 | — |
| 任何人 | 可追加备注（API 开放） | 任何状态 |

> **UI 范围**: 备注输入 UI 仅在 DispatcherWorkbench 和 CompleterWorkbench 的 Drawer 中提供。SubmitterWorkbench 不暴露备注输入（但 API 层面允许，submitter 可通过 API 添加备注）。

**理由**: 指派后锁定原始内容，体现"尊敬 submit 原始内容"原则。后来者只能追加备注，不能篡改。

### Decision 4: 编辑审计格式

**选择**: 每次编辑写入一条 `ticket_history` 记录：

```json
{
  "action": "edited",
  "fromStatus": "submitted",
  "toStatus": "submitted",
  "details": {
    "field": "title",
    "oldValue": "原始标题",
    "newValue": "修改后的标题"
  }
}
```

`fromStatus` 和 `toStatus` 均设为工单当前状态（编辑不改变状态）。`toStatus` 为 NOT NULL 列，必须提供值。

如果一次编辑多个字段，写入多条 `ticket_history` 记录（每个字段一条），保持 Timeline 展示的清晰性。

### Decision 5: 备注格式

**选择**: `action='commented'`，`fromStatus` 和 `toStatus` 均设为工单当前状态（备注不改变状态，`toStatus` 为 NOT NULL 列必须提供值），`details` 存储：

```json
{
  "comment": "已确认问题，正在修复中"
}
```

备注 ≤2000 字符（与 description 限制一致）。

### Decision 6: API 设计

两个新端点：

```
PATCH  /api/tickets/:id           — 编辑工单
  Body: { title?, description?, priority?, dueDate? }
  权限: 内联身份校验（createdBy === user.username，非 RBAC ticket:edit），仅限 status=submitted
  校验: title 不为空且 ≤200 字符，description（若提供）≤2000 字符，priority 在 low/medium/high 中，dueDate（若提供）为 YYYY-MM-DD 格式
  行为: 更新 tickets 表字段 + 写入 ticket_history（每个变更字段一条 edited 记录）

POST   /api/tickets/:id/comments  — 添加备注
  Body: { comment: string }
  权限: 登录用户
  校验: comment 不为空且 ≤2000 字符
  行为: 写入 ticket_history（action=commented）
```

### Decision 7: Timeline 渲染

新增两种 action 的渲染：

| action | 颜色 | 显示内容 |
|--------|------|---------|
| `edited` | `#722ed1` (purple) | "编辑了{字段}"，附带 oldValue → newValue |
| `commented` | `#52c41a` (green) | 显示 comment 文本，actor + 时间戳 |

### Decision 8: 共享类型 + 常量变更顺序

`ACTION_LABELS` 和 `ACTION_COLORS` 常量保留在 `apps/web/src/components/Timeline.tsx` 本地（不移到 shared），它们属于 UI 展示逻辑而非共享类型。

```
1. packages/shared: TicketHistoryAction 类型新增 'edited' | 'commented'
2. apps/server: 路由改造 + 测试
3. apps/web: API client + Timeline 扩展 + TicketDetailDrawer 改造 + 工作台 UI + 测试
```

## Risks / Trade-offs

- **Risk**: `ticket_history` 同时存储状态事件和内容事件，Timeline 渲染复杂度增加 → **Mitigation**: 两种新 action 的渲染逻辑独立，不影响现有状态事件的渲染
- **Risk**: PATCH 端点允许部分更新（只传 title 不传 description），可能导致前端状态不一致 → **Mitigation**: PATCH 只更新 body 中提供的字段，未提供的保持不变
- **Risk**: `PATCH /api/tickets/:id` 与现有 `PATCH /api/tickets/:id/assign` 等子路由可能冲突 → **Mitigation**: Hono 的 trie-based smart router 可正确区分不同路径深度的路由（`/:id/assign` 为 3 段，`/:id` 为 2 段），但需确保 `PATCH /:id` 注册在更具体的子路由之后
- **Trade-off**: 编辑历史在 Timeline 中按时间线性排列，无法看到"某次编辑包含了哪些字段"的聚合视图 → 可接受，MVP 不需要版本对比视图
- **Trade-off**: 备注和编辑共用 `ticket_history` 表，未来如果需要独立的评论回复/点赞等功能可能需要拆表 → 可接受，当前无此需求

## Open Questions

1. 编辑是否需要"保存草稿"模式（编辑后需确认才生效），还是直接保存？当前设计是直接保存并写入历史。
2. submitter 能否在 `assigned` 之后继续添加备注？当前设计允许任何人任何状态添加备注。
3. 备注是否需要支持 @提及 或 Markdown？当前设计是纯文本。
4. 是否需要 `PATCH` 端点支持一次请求修改多个字段并生成一条聚合的 `edited` 记录（而非多条）？
