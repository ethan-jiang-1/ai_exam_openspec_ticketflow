## Context

前端三个工作台已完成（change ③），工单列表用纯文本显示状态和时间。后端 API 已就绪（change ②），6 个端点可用。现有测试覆盖单元级别（API client、页面组件、后端路由），但缺少端到端集成测试。README 有 Demo Roadmap 但没有具体的演示步骤。

## Goals / Non-Goals

**Goals:**
- 工单状态显示更友好（Status badge）
- 自动化验证完整工单流转
- 新人可按 README 独立完成 Demo 演示

**Non-Goals:**
- 不引入组件库或设计系统
- 不做动画或过渡效果
- 不修改后端 API

## Decisions

### D1: Status badge 用纯 CSS class 实现

为每种状态定义 `.status-{status}` CSS class，用背景色区分。不引入第三方 badge 组件，不抽取 React 组件 — 直接在 `<td>` 上加 class，保持简单。

颜色映射：
- `submitted` → 蓝色
- `assigned` → 黄色
- `in_progress` → 橙色
- `completed` → 绿色

**理由**: Demo 阶段纯 CSS 足够，减少抽象层次。

### D2: 集成测试通过 Hono app.request() 测试

在 `apps/server/src/__tests__/integration.test.ts` 中，通过 `app.request()` 直接调用 API，按顺序执行 create → assign → start → complete，验证每步的状态变迁和响应数据。测试隔离使用 Drizzle `db.delete(tickets)`。

**理由**: 复用现有测试基础设施（Hono app.request + Drizzle ORM），不需要启动真实服务器。

### D3: README 演示步骤

在 README.md 的 Demo Roadmap 区域后新增"演示步骤"章节，分步骤说明：
1. 启动服务
2. 提交者创建工单
3. 调度者指派工单
4. 完成者处理工单

**理由**: 让陌生人无需看代码即可完成演示。

## Directory Layout

```
apps/web/src/
├── App.css                          # 修改：新增 status badge 样式
├── pages/
│   ├── SubmitterWorkbench.tsx       # 修改：status badge
│   ├── DispatcherWorkbench.tsx      # 修改：同上
│   └── CompleterWorkbench.tsx       # 修改：同上

apps/server/src/__tests__/
└── integration.test.ts              # 新增：完整流转集成测试

README.md                            # 修改：新增演示步骤
```

## Risks / Trade-offs

- **[Risk] 集成测试与现有路由测试重叠** → 集成测试关注端到端流转顺序，路由测试关注单个端点的边界条件，关注点不同

## Open Questions

1. **Status badge 要不要用中文标签？** — 假设用英文（submitted/assigned/in_progress/completed），与 API 返回值一致，减少翻译维护。
2. **README 演示步骤要不要截图？** — 假设不截图，纯文字步骤，保持 README 轻量。
