## Context

Demo 阶段用 3 个 CSS 文件（`App.css`、`Layout.css`、`RoleSelect.css`）+ `index.css` 全局变量构建 UI。页面包括：角色选择页（3 个按钮）、3 个工作台（手写 `<table>` / `<form>` / `<select>`）。所有组件都是原生 HTML 元素 + 手写样式，无组件库依赖。

当前前端依赖：React 19、react-router-dom 7、Vite 8。无 UI 组件库。

## Goals / Non-Goals

**Goals:**

- 引入 antd 作为统一组件库，覆盖 Layout / Table / Form / Tag / Button / Card / Select / Empty / message
- 将 Demo 页面全部迁移到 antd 组件，功能行为不变
- 清理被 antd 替代的手写 CSS，保留最小自定义样式
- 在 `main.tsx` 入口设置 ConfigProvider + zhCN locale，统一中文产品体验

**Non-Goals:**

- 不做主题定制（使用 antd 默认主题）
- 不做暗色模式适配
- 不做响应式布局优化
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
├── index.css             # 精简为最小全局样式
├── components/
│   └── Layout.tsx        # 重构为 antd Layout
│   └── Layout.css        # 删除
├── pages/
│   ├── RoleSelect.tsx    # 重构为 antd Card
│   ├── RoleSelect.css    # 删除
│   ├── SubmitterWorkbench.tsx  # 重构为 antd Form + Table
│   ├── DispatcherWorkbench.tsx # 重构为 antd Table + Select
│   └── CompleterWorkbench.tsx  # 重构为 antd Table
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
3. 现有测试文件（`RoleSelect.test.tsx`、`workbench.test.tsx`）依赖原生 DOM 结构，antd 迁移后 DOM 查询方式需适配。测试逻辑不变，但 `getByRole('row')`、`getByText('选择角色')` 等查询可能需要改为 `getByText` + 更具体的 selector 或 `data-testid`。具体适配策略在实施时确定。
