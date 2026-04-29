## Context

Demo 阶段用 3 个 CSS 文件（`App.css`、`Layout.css`、`RoleSelect.css`）+ `index.css` 全局变量构建 UI。页面包括：角色选择页（3 个按钮）、3 个工作台（手写 `<table>` / `<form>` / `<select>`）。所有组件都是原生 HTML 元素 + 手写样式，无组件库依赖。

当前前端依赖：React 19、react-router-dom 7、Vite 8。无 UI 组件库。

## Goals / Non-Goals

**Goals:**

- 引入 antd 作为统一组件库，覆盖 Layout / Table / Form / Tag / Button / Card / Select / Empty / Drawer / Descriptions / message
- 将 Demo 页面全部迁移到 antd 组件，功能行为不变
- 清理被 antd 替代的手写 CSS，保留最小自定义样式
- 在 `main.tsx` 入口设置 ConfigProvider + zhCN locale，统一中文产品体验
- 响应式适配：窄屏下角色选择页 Card 堆叠、Table 次要列隐藏、操作列固定可见
- 前后端双重输入校验：title ≤ 200 字符、description ≤ 2000 字符
- 三个工作台均支持点击标题弹出 Drawer 查看工单完整详情

**Non-Goals:**

- 不做主题定制（使用 antd 默认主题）
- 不做暗色模式适配
- 不新增业务功能（不新增字段、API、状态）
- 不引入 CSS-in-JS 方案（antd v5 内置 emotion，无需额外配置）

## Decisions

### D1: antd 版本选择 — v5.x

antd v5 采用 CSS-in-JS（emotion），不再需要额外引入 CSS 文件。与 Vite 8 + React 19 兼容。只需安装 `antd`，不安装 `@ant-design/icons`（本 change 无 icon 使用场景，后续按需引入）。

**替代方案**: antd v4 — 需要 Less 编译配置，与 Vite 集成复杂度高。不选。

### D2: 页面骨架 — antd Layout 组件

用 `Layout` + `Layout.Header` + `Layout.Content` 替换手写 `.layout` / `.layout-header` / `.layout-main` CSS。Header 内用 antd `Button` 做"切换角色"按钮。

### D3: 角色选择页 — antd Card + Row/Col

用 3 个 antd `Card` 组件替换按钮，`Row` / `Col` 布局。Card 点击行为与原按钮一致。

### D4: 工单列表 — antd Table 组件

用 antd `Table` 替换手写 `<table>`，通过 `columns` 配置定义列。状态列用 `Tag` 渲染，操作列用 `Button` 渲染。所有 Table 设置 `pagination={false}`（工单数量少，无需分页）。

### D5: 创建工单表单 — antd Form

用 antd `Form` + `Form.Item` + `Input` + `Input.TextArea` + `Button` 替换手写 `<form>`。表单验证通过 antd `rules` 配置。

### D6: 状态 badge — antd Tag

| status | antd Tag color |
|---|---|
| submitted | blue |
| assigned | gold |
| in_progress | orange |
| completed | green |

### D7: 错误提示 — antd App.useApp() message

用 antd `App` 组件（import 别名 `AntdApp` 避免与项目 `App` 碰撞）包裹应用（在 ConfigProvider 内部），通过 `const { message } = AntdApp.useApp()` hook 获取 message 实例。不使用 `message.error()` 静态方法（React 18+ strict mode 下会产生警告）。

### D8: 空状态 — antd Empty

用 `<Empty description="暂无待处理的工单" />` 替换手写 `<p className="empty-hint">`。

### D9: 指派人控件 — antd Select

用 antd `Select` 替换 `<select>`，选项从硬编码数组 `['completer']` 渲染。为后续 MVP 从 users 表动态加载预留接口。

### D9.5: 工单详情查看 — antd Drawer + Descriptions

三个工作台的标题列均为可点击链接（`<a onClick>`），点击后弹出 antd `Drawer`（宽度 480px），内部使用 antd `Descriptions`（`column={1}`、`bordered`、`size="small"`）展示工单完整详情（状态 Tag、创建者、指派给、创建时间、描述）。提供 `STATUS_LABELS` 映射（submitted→已提交、assigned→已指派、in_progress→处理中、completed→已完成）用于 Drawer 中状态列的中文显示。

### D9.6: 响应式布局策略

- **Layout Header**: 设置 `flexWrap: wrap` + `gap: 8px`，窄屏下角色名和"切换角色"按钮自动换行
- **Layout Content**: `padding: 24px 16px`，antd 组件自身处理窄屏适配
- **角色选择页**: antd `Col` 设置 `xs={24} sm={8}`，窄屏（< 576px）Card 纵向堆叠，宽屏横向排列
- **Table 列隐藏**: 调度者/完成者工作台的"创建者"和"创建时间"列设置 `responsive: ['lg']`（≥ 1024px 显示）；提交者工作台的"创建时间"列同理
- **Table 操作列**: 调度者/完成者操作列 `fixed: 'right'` + `width: 200`/`width: 120`，窄屏下始终可见
- **Table 标题列**: 所有工作台 `ellipsis: true` + `width`（百分比），超长标题截断 + hover tooltip
- **Table 横滚**: 所有工作台 `scroll={{ x: 'max-content' }}`

### D9.7: 输入验证策略（前后端双重校验）

- **前端**: antd Form `rules` 添加 `max: 200`（title）和 `max: 2000`（description）；Input 设置 `maxLength={200}`、TextArea 设置 `maxLength={2000}`，均添加 `showCount` 显示字数
- **前端**: `handleSubmit` 中 description 使用 `?? ''` 防止用户未填写时 `undefined.trim()` 崩溃
- **后端**: `POST /api/tickets` 增加 `body.title.length > 200` 和 `body.description.length > 2000` 校验，超长返回 400

### D9.8: 测试环境 antd 兼容

jsdom 缺少 antd 依赖的浏览器 API，`setup-tests.ts` 添加 mock：
- `window.matchMedia`：返回固定 `{ matches: false }` 对象，antd 响应式组件需要
- `globalThis.ResizeObserver`：空实现 class，antd Table 列宽计算需要

### D10: CSS 清理策略

| 文件 | 策略 |
|---|---|
| `index.css` | 移除 `#root` 的 width/border 约束、`:root` 全局字体变量（`--sans`/`--heading`/`--mono`/`font`/`letter-spacing` 等）、`h1`/`h2`/`p`/`code` 全局元素样式、`@media (prefers-color-scheme: dark)` 块，只保留 `body { margin: 0 }` |
| `App.css` | 删除所有样式（`.btn`、`.ticket-form`、`.ticket-table`、`.error-msg`、`.empty-hint`、`.status-badge`），文件可删除或保留空文件 |
| `Layout.css` | 删除，antd Layout 完全覆盖 |
| `RoleSelect.css` | 删除，antd Card + Row 完全覆盖 |

### D11: 目录结构

```
apps/web/src/
├── main.tsx              # 添加 ConfigProvider + AntdApp + zhCN 包裹
├── App.tsx               # 路由不变，移除 App.css import
├── App.css               # 清空或删除
├── index.css             # 精简为 body { margin: 0 }
├── setup-tests.ts        # 添加 matchMedia + ResizeObserver mock（jsdom 兼容 antd）
├── components/
│   └── Layout.tsx        # 重构为 antd Layout（Header flexWrap 响应式）
├── pages/
│   ├── RoleSelect.tsx    # 重构为 antd Card + Row/Col（xs={24} sm={8} 响应式）
│   ├── SubmitterWorkbench.tsx  # 重构为 antd Form + Table + Drawer（含验证、居中）
│   ├── DispatcherWorkbench.tsx # 重构为 antd Table + Select + Drawer（含响应式列）
│   └── CompleterWorkbench.tsx  # 重构为 antd Table + Drawer（含响应式列）
├── context/
│   └── RoleContext.tsx    # 不变
└── api/
    └── client.ts         # 不变
```

### D12: 配置管理

- antd ConfigProvider 在 `main.tsx` 中设置 `locale={zhCN}`
- antd `App` 组件在 ConfigProvider 内部包裹应用，提供 `message` 上下文
- Vite dev proxy 配置不变（`/api` → `http://localhost:3000`）
- 无新增环境变量

## Risks / Trade-offs

- **antd bundle size (~1MB gzip ~300KB)** → 可接受，MVP 阶段不做 tree-shaking 优化
- **antd v5 与 React 19 兼容性** → antd v5.22+ 已正式支持 React 19，需确认安装版本 >= 5.22
- **CSS 冲突** → `index.css` 中 `#root` 的 `width: 1126px` 和 `text-align: center` 会破坏 antd 布局，必须移除
- **手写 CSS 清理不彻底** → 残留样式可能与 antd 冲突，需逐一验证

## Open Questions

1. ~~antd `Table` 的 `pagination` 是否默认开启？~~ → **已决定**: 设置 `pagination={false}`，MVP 工单数量少无需分页（见 US-007）
2. ~~角色选择页的 Card 交互~~ → **已决定**: 使用 `hoverable` + `onClick`，spec WF-001 已明确
3. ~~现有测试文件（`RoleSelect.test.tsx`、`workbench.test.tsx`）依赖原生 DOM 结构，antd 迁移后 DOM 查询方式需适配。~~ → **已解决**: 在测试 wrapper 中添加 `ConfigProvider` + `AntdApp` provider；DOM 查询从 `getAllByRole('row')` 改为基于文本内容（`getByText`）的断言；`setup-tests.ts` 添加 `matchMedia` + `ResizeObserver` mock。所有测试通过。
