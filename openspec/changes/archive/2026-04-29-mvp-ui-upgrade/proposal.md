## Why

Demo 阶段使用手写 CSS + 原生 HTML 元素构建 UI，视觉粗糙、组件不一致。MVP 需要一个统一的视觉基础，让后续 Change（登录、权限、Dashboard、工单详情 Drawer）都在专业级组件库上开发，避免重复造轮子。Ant Design 是中文产品最自然的选择，Table / Form / Tag / Button / Card / Layout 开箱即用。

## What Changes

- 引入 `antd` 作为前端 UI 依赖
- 用 antd `Layout` / `Header` / `Content` 重构整体页面骨架，替换手写 `.layout` CSS
- 用 antd `Card` 重构角色选择页，替换手写按钮样式
- 用 antd `Form` / `Input` / `Button` 重构提交者创建工单表单，替换手写 `<form>`
- 用 antd `Table` 重构三个工作台的工单列表，替换手写 `<table>`
- 用 antd `Tag` 重构状态 badge，替换手写 `.status-badge` CSS
- 用 antd `Select` 重构调度者指派人控件，替换 `<select>` 硬编码
- 用 antd `Empty` 替换手写空状态提示
- 用 antd `message` 替换手写 `.error-msg` 错误提示
- 用 antd `Button` 统一所有操作按钮
- 清理 `App.css`、`Layout.css`、`RoleSelect.css` 中被 antd 替代的样式规则
- 移除 `index.css` 中与 antd 冲突的全局字体/布局样式
- 响应式适配：角色选择页 Card 在窄屏堆叠、Table 列在窄屏隐藏次要列、操作列 `fixed: 'right'` 始终可见
- 提交者表单居中 + `maxLength` 限制（title 200 / description 2000）+ `showCount` 字数提示
- 后端 `POST /api/tickets` 增加 title/description 长度校验（200 / 2000）
- 工单标题超长时 `ellipsis` 截断 + tooltip 显示全文
- 三个工作台点击标题弹出 antd `Drawer` 查看工单详情

## Capabilities

### New Capabilities

- `ui-system`: Ant Design UI 体系引入 — 组件注册、全局样式配置（中文 locale、主题色）、CSS 清理策略

### Modified Capabilities

- `workflow`: WF-001 ~ WF-009 的 UI 实现层从手写 HTML/CSS 迁移到 antd 组件，需求行为不变但组件规格更新（Table 列定义、Form 字段、Tag 颜色映射等）

## Impact

- **新增依赖**: `antd` 添加到 `apps/web/package.json`
- **重构文件**: `apps/web/src/pages/RoleSelect.tsx`、`SubmitterWorkbench.tsx`、`DispatcherWorkbench.tsx`、`CompleterWorkbench.tsx`
- **重构文件**: `apps/web/src/components/Layout.tsx`
- **精简文件**: `apps/web/src/App.css`（删除被 antd 替代的按钮/表格/badge/表单/错误样式）
- **精简文件**: `apps/web/src/components/Layout.css`（删除被 antd Layout 替代的样式）
- **精简文件**: `apps/web/src/pages/RoleSelect.css`（删除被 antd Card 替代的样式）
- **调整文件**: `apps/web/src/index.css`（移除与 antd 冲突的全局 font/width 约束）
- **调整文件**: `apps/web/src/main.tsx`（添加 ConfigProvider + AntdApp + zhCN locale 包裹）
- **调整文件**: `apps/web/src/setup-tests.ts`（添加 matchMedia + ResizeObserver mock）
- **调整文件**: `apps/server/src/routes/tickets.ts`（POST 增加 title/description 长度校验）
- **不变**: shared 类型、数据库 schema 均不受影响

## Success Criteria

- `pnpm check`（build + test + lint）全部通过
- 角色选择页显示为 antd Card 布局
- 三个工作台使用 antd Table 展示工单列表
- 状态字段显示为 antd Tag（颜色与 Demo 一致：蓝/黄/橙/绿）
- 创建工单使用 antd Form + Input + Button
- 错误提示使用 antd message，不再有 `.error-msg` DOM
- 手写 CSS 中仅保留 antd 无法覆盖的极少量自定义样式
- 浏览器可完整走通 Demo 流程（创建→指派→开始→完成）
- 窄屏下角色选择页 Card 堆叠、Table 次要列隐藏、操作列始终可见
- 超长标题在 Table 中截断显示省略号，hover 可看全文
- 超长 title/description 前端 Form 校验拦截、后端 400 拒绝
- 提交者工作台点击标题可弹出 Drawer 查看工单完整详情
- 调度者和完成者工作台点击标题也可弹出 Drawer 查看工单详情
