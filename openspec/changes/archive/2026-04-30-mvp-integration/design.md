## Context

当前 MVP 功能完整，但 UI 层有三个问题：(1) 三个工作台 Table 中 status 列渲染英文 key 而非中文标签，(2) 应用无品牌标识、无主题定制，(3) 无角色视觉差异化。此 change 是 MVP 的收尾交付物，只涉及前端 UI 层和共享常量，不改后端、不改 schema、不添依赖。

## Goals / Non-Goals

**Goals:**
- 修复 4 个已知 bug：status 英文标签、Completer 硬编码过滤、Completer Drawer 缺 dueDate、LoginPage Card 缺 hoverable
- 建立品牌视觉：页面标题、Header 应用名、favicon、meta 标签
- antd 主题定制：ConfigProvider `theme` token 设置品牌色
- 角色视觉差异化：登录页卡片按角色着色，Header 角色 badge 不同颜色
- 每个工作台添加欢迎语和工单统计
- 统一空状态组件
- 提取三个工作台中重复的常量到 `packages/shared`
- 更新 ST-004（admin 角色）、UA-005（4 用户）、US-005（测试文件名）

**Non-Goals:**
- 不引入新 npm 依赖
- 不修改后端代码
- 不添加 Dashboard/图表（MVP1）
- 不添加分页/筛选/搜索（MVP1）
- 不添加暗色模式（MVP2）
- 不添加移动端响应式导航（MVP2）
- 不做工单时间线/历史追踪（MVP1）

## Decisions

> **能力编码注册**: `MP = mvp-polish`（新增缩写，加入编码表）

### 1. 品牌色和主题定制

使用 antd `ConfigProvider` 的 `theme` prop 设置品牌 token，无需引入 CSS 文件或 styled-components。

**选择**: `colorPrimary: '#1677ff'`（保持 antd 默认蓝，不做激进变化），通过 `token` 微调 border-radius、font-size 等。

**备选考虑**: 自定义色系（如 teal/green）→ 拒绝，蓝色在 B2B 工单系统中更专业，且无需额外设计决策。

### 2. 角色视觉差异化策略

角色配色方案（素雅克制，非 antd 默认色板直出）：

| 角色 | 主色 | 含义 | Header 背景 |
|------|------|------|-------------|
| submitter | `#5b8def`（柔和蓝） | 用户/创建者 | `#f0f5ff` |
| dispatcher | `#7c3aed`（优雅紫） | 管理者/分派 | `#f5f0ff` |
| completer | `#059669`（温润绿） | 执行者 | `#ecfdf5` |
| admin | `#d97706`（沉稳琥珀） | 系统管理 | `#fff7ed` |

Header 背景使用对应主色的 5% 透明度等效色（手工调色，不依赖 CSS opacity）。

**选择**: 角色 badge 使用 antd Tag 组件，登录页 Card 边框和阴影按角色着色，Header 角色名用彩色 Tag 包裹。

**备选考虑**: 使用不同 layout header 背景色 → 拒绝，Header 保持白色更干净，角色差异通过 badge 体现即可。

### 3. 共享常量提取

三个工作台中重复定义的 `STATUS_COLORS`、`STATUS_LABELS`、`PRIORITY_COLORS`、`PRIORITY_LABELS` 提取到 `packages/shared/src/ticket-types.ts`，从 `@ticketflow/shared` 统一导入。

**选择**: 放入 `packages/shared` 而非新建文件。这些常量与 `TicketStatus`、`TicketPriority` 类型紧密耦合，放在同一包中避免拆分过细。

### 4. 欢迎统计实现方式

每个工作台顶部使用 antd `Row`/`Col` + `Card` 或 `Statistic` 组件展示工单数量统计（如"待处理: 3"/"进行中: 1"/"已完成: 5"）。统计数据从已获取的 ticket 列表客户端计算得出，不增加 API 调用。

**选择**: 使用 antd `Card` + 简单计数（非 `Statistic` 组件）。`Statistic` 组件偏重展示数字动画，对 MVP 过度设计。

### 5. Bug 修复影响范围

- **Status 标签**: 三处 table column `render` 中将 `{status}` 改为 `{STATUS_LABELS[status] || status}`
- **Completer 硬编码**: 将 `t.assignedTo === 'completer'` 改为 `t.assignedTo === user?.username`
- **Completer Drawer dueDate**: 从其他工作台复制 dueDate 展示逻辑（含 overdue/today 判断）
- **LoginPage hoverable**: Card 添加 `hoverable` prop

## Risks / Trade-offs

- [共享常量变更可能影响测试] → 更新共享类型后同步更新测试引用的值（如 ROLE_LIST.length 4）
- [角色颜色选择主观] → 使用 antd 预设色板中的标准色（blue/purple/green/orange），有成熟的对比度保证
- [favicon 设计] → 使用纯文本 SVG（"T" 字母 + 品牌色），无需设计工具

## Open Questions

1. 登录页角色卡片是否需要进一步差异化（如不同 icon）还是仅颜色边框足够？→ 建议仅颜色边框+shadow，保持简洁
2. 工作台统计卡片的布局：水平排列在标题下方还是侧边栏形式？→ 建议水平排列，占用少、一目了然
3. 是否需要在页面底部添加 footer（版权信息等）？→ 建议不加，MVP 保持轻量
