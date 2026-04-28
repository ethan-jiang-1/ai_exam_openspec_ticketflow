## Context

`packages/shared` 当前仅导出 `AppInfo` 类型和 `APP_INFO` 常量。后续 change ②（建表 + API）和 ③（前端 UI）需要统一的工单领域模型。本 change 在不引入任何新依赖的前提下，扩展现有共享类型包。

## Goals / Non-Goals

**Goals:**
- 定义 Role、TicketStatus、Ticket 三组类型及对应运行时常量
- 类型可被 apps/web 和 apps/server 直接 import，无需额外构建步骤
- 类型定义与后续 Drizzle schema 和 REST API 契约一致

**Non-Goals:**
- 不引入 Zod / io-ts 等运行时校验库
- 不定义 API 路由、数据库 schema（属于 change ②）
- 不定义前端组件 props 类型（属于 change ③）

## Decisions

### D1: 使用 const object + typeof 模式定义联合类型

用 `const` 对象 + `as const` 定义运行时常量，再用 `typeof obj[keyof typeof obj]` 推导联合类型。不使用 TypeScript `enum`。

**理由**: `enum` 会产生运行时代码且与 tree-shaking 不友好；`as const` 对象同时提供运行时值和编译期类型，且与后续 Drizzle schema 定义方式一致。常量对象的键名统一与值保持一致（如 `in_progress: "in_progress"`），避免 camelCase/snake_case 混用导致消费者困惑。

### D2: 单文件组织

所有工单领域类型定义在 `packages/shared/src/ticket-types.ts`，由 `index.ts` 统一 re-export。

**理由**: 当前类型量小（3 组类型），不值得拆分多个文件。后续 change ② 在 server 端建表时，只需 import `TicketStatus` 等类型即可。

### D3: 同时提供对象常量和数组常量

除 `ROLES` / `TICKET_STATUSES` 对象常量外，同时导出 `ROLE_LIST` / `TICKET_STATUS_LIST` 数组常量。

**理由**: 前端 change ③ 渲染下拉框、badge 颜色映射等场景需要遍历所有值。`as const` 对象的 `Object.values()` 可以推导，但显式数组常量使用更直观且类型更精确。

### D4: Ticket 字段设计

```
Ticket {
  id: string              // UUID v4
  title: string
  description: string
  status: TicketStatus
  createdBy: string       // 提交者用户名（Demo 阶段无真实登录）
  assignedTo: string | null
  createdAt: string       // ISO 8601
  updatedAt: string       // ISO 8601
}
```

**理由**: 覆盖 README 中 Demo 验收标准所需的最小字段集。`assignedTo` 为 nullable 表示尚未指派。不含 `priority` / `dueDate` 等扩展字段（README 明确排除）。

### D5: 状态流转与角色可见性不在本 change 定义

Demo 流程 `submitted → assigned → in_progress → completed` 的流转约束（如不能从 completed 跳回 submitted）和角色可见性映射（submitter 看自己创建的、dispatcher 看待指派的、completer 看指派给自己的）均不在类型层体现，留给 change ② API 层（流转校验）和 change ③ 前端层（视图过滤）实现。

**理由**: 类型定义只描述数据形状，流转规则是业务逻辑，不适合在纯类型中约束。

### D6: 配置管理策略与开发代理策略

本 change 不引入配置项、环境变量、网络端点或开发代理变更。纯类型定义无需这些。

## Directory Layout

```
packages/shared/src/
├── index.ts            # 统一导出（re-export ticket-types）
├── ticket-types.ts     # 新增：Role / TicketStatus / Ticket 定义
└── __tests__/
    └── ticket-types.test.ts  # 新增：类型约束测试
```

## Risks / Trade-offs

- **[Risk] 类型与后续 Drizzle schema 不一致** → Ticket interface 仅定义应用层契约；Drizzle schema 在 change ② 中定义，字段名和类型必须对齐，届时通过 `InferSelectModel` 做 compile-time 校验
- **[Risk] Ticket 字段后续需扩展** → 当前是最小子集，扩展时只需在 interface 加字段，不破坏现有消费者（TypeScript structural typing）

## Open Questions

1. **Ticket.id 用 string 还是 number？** — 假设用 string（UUID），因为 REST API 路径更友好且与后续真实系统一致。change ② 实现时可调整。
2. **是否需要 `CreateTicketInput` / `UpdateTicketInput` 等输入类型？** — 本 change 只定义核心领域类型，输入类型在 change ② API 实现时按需定义。
