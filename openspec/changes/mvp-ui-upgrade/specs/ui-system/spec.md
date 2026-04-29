## ADDED Requirements

### Requirement: US-001 Ant Design 依赖安装

`apps/web/package.json` 的 dependencies SHALL 包含 `antd`（版本 >= 5.22，支持 React 19）。

#### Scenario: antd 可在 React 19 环境下正常渲染

- **WHEN** 在 `apps/web` 中执行 `pnpm install` 后启动开发服务器
- **THEN** antd 组件（如 `<Button>`）SHALL 正常渲染，无 React 版本兼容性警告

### Requirement: US-002 ConfigProvider 中文 locale 配置

`apps/web/src/main.tsx` SHALL 用 antd `ConfigProvider` 包裹根组件，设置 `locale={zhCN}`，确保所有 antd 组件（Table 空状态、Form 验证消息、DatePicker 等）使用中文文案。

#### Scenario: Table 空状态显示中文

- **WHEN** antd Table 渲染空数据（`dataSource={[]}`）
- **THEN** 空状态文案 SHALL 显示 antd 默认中文 "暂无数据"

### Requirement: US-003 手写 CSS 清理

以下手写 CSS 规则 SHALL 被移除，由 antd 内置样式替代：

- `App.css` 中：`.btn`、`.btn-switch`、`.ticket-form`、`.ticket-form input`、`.ticket-form textarea`、`.ticket-table`、`.ticket-table th/td`、`.error-msg`、`.empty-hint`、`.status-badge` 及所有 `.status-*` 类
- `Layout.css` 全部内容（由 antd Layout 替代）
- `RoleSelect.css` 全部内容（由 antd Card + Row 替代）
- `index.css` 中 `#root` 的 `width: 1126px`、`max-width: 100%`、`margin: 0 auto`、`text-align: center`、`border-inline`、`min-height`、`display: flex`、`flex-direction: column`、`box-sizing` 规则 SHALL 被移除
- `index.css` 中 `:root` 块的全局字体/字号/行高/字间距变量（`--sans`、`--heading`、`--mono`、`font`、`letter-spacing`、`color-scheme`、`font-synthesis`、`text-rendering`、`-webkit-font-smoothing`、`-moz-osx-font-smoothing`）SHALL 被移除（antd 提供自己的排版系统）
- `index.css` 中 `:root` 块的颜色/阴影变量（`--text`、`--text-h`、`--bg`、`--border`、`--code-bg`、`--accent`、`--accent-bg`、`--accent-border`、`--social-bg`、`--shadow`）SHALL 被移除（引用这些变量的 CSS 类已全部删除）
- `index.css` 中 `h1`、`h2`、`p`、`code`、`.counter` 等全局元素样式规则 SHALL 被移除（antd 组件自带排版）
- `index.css` 中 `@media (prefers-color-scheme: dark)` 块 SHALL 被移除（Non-Goal：不做暗色模式）

#### Scenario: 无残留手写样式冲突

- **WHEN** 在浏览器中加载应用
- **THEN** `#root` 元素 SHALL 无固定 1126px 宽度约束，antd 组件 SHALL 占满可用宽度

### Requirement: US-004 index.css 最小保留

`apps/web/src/index.css` 清理后 SHALL 仅保留 `body { margin: 0 }` 和必要的 `box-sizing` 基础规则。antd 提供自己的全局排版系统，原 `:root` 字体变量、`h1`/`h2`/`p`/`code` 元素样式、暗色模式 `@media` 块均不再需要。

#### Scenario: 清理后样式不遗漏

- **WHEN** 删除 `index.css` 中被标记移除的规则（`#root` 约束、`:root` 字体变量、全局元素样式、暗色模式块）
- **THEN** 页面基础排版 SHALL 正常（antd 组件提供排版），`body` margin SHALL 为 0

### Requirement: US-005 现有测试适配

UI 重构后，`apps/web/src/__tests__/RoleSelect.test.tsx` 和 `apps/web/src/__tests__/workbench.test.tsx` SHALL 适配 antd 组件的 DOM 结构，确保所有现有测试用例在 antd 组件下仍然通过。测试逻辑（过滤规则、角色跳转）不变，仅调整 DOM 查询方式以匹配 antd 渲染结果。

#### Scenario: RoleSelect 测试适配后通过

- **WHEN** 运行 `pnpm test`
- **THEN** `RoleSelect.test.tsx` 中所有 4 个测试用例（渲染三个角色、点击写入 localStorage、已有角色跳转、无效角色停留）SHALL 通过

#### Scenario: workbench 过滤测试适配后通过

- **WHEN** 运行 `pnpm test`
- **THEN** `workbench.test.tsx` 中所有 3 个过滤测试用例（submitter 只看自己创建、dispatcher 看未完成、completer 看被指派给自己的）SHALL 通过

### Requirement: US-006 antd message API 使用方式

前端 SHALL 使用 antd `App` 组件（import 别名 `AntdApp`）包裹应用，通过 `AntdApp.useApp()` hook 获取 `message` 实例，而非使用 `message.error()` 静态方法。静态方法在 React 18+ strict mode 下会产生控制台警告。

#### Scenario: message 通过 hook 使用

- **WHEN** 工作台中 API 调用失败需要显示错误
- **THEN** SHALL 通过 `const { message } = AntdApp.useApp()` 获取的实例调用 `message.error()`，控制台 SHALL 无 React 兼容性警告

### Requirement: US-007 antd Table 分页配置

所有工作台的 antd `Table` 组件 SHALL 设置 `pagination={false}`，关闭默认分页。MVP 阶段工单数量少，分页反而影响体验。

#### Scenario: Table 无分页器

- **WHEN** antd Table 渲染任意数量的工单（包括 >10 条）
- **THEN** Table 底部 SHALL 不显示分页控件，所有数据行 SHALL 直接展示
