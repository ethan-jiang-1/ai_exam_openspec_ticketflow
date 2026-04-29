## 1. 依赖安装与全局配置

> 依赖：无（首个 task group）

- [ ] 1.1 在 `apps/web` 安装 `antd`（>= 5.22）依赖 [US-001]
- [ ] 1.2 在 `apps/web/src/main.tsx` 中用 antd `ConfigProvider`（`locale={zhCN}`）+ antd `App` 组件（import 别名 `AntdApp`）包裹根组件，层级为 `ConfigProvider > AntdApp > RoleProvider > ...` [US-002, US-006]
- [ ] 1.3 验证：`pnpm dev` 启动无报错，antd Button 可渲染，控制台无 React 兼容性警告

## 2. CSS 清理

> 依赖：1

- [ ] 2.1 精简 `apps/web/src/index.css`：移除 `#root` 约束（width/max-width/text-align/border-inline/min-height/display/flex-direction/box-sizing）、`:root` 全局字体变量（`--sans`/`--heading`/`--mono`/`font`/`letter-spacing`/`color-scheme`/`font-synthesis`/`text-rendering`/`-webkit-font-smoothing`/`-moz-osx-font-smoothing`）、`h1`/`h2`/`p`/`code`/`.counter` 全局元素样式、`@media (prefers-color-scheme: dark)` 块，仅保留 `body { margin: 0 }` [US-003, US-004]
- [ ] 2.2 清空 `apps/web/src/App.css` 中被 antd 替代的样式（`.btn`、`.ticket-form`、`.ticket-table`、`.error-msg`、`.empty-hint`、`.status-badge` 及所有 `.status-*`），移除 App.tsx 中的 `import './App.css'` [US-003]
- [ ] 2.3 删除 `apps/web/src/components/Layout.css` 文件，移除 Layout.tsx 中的 import [US-003]
- [ ] 2.4 删除 `apps/web/src/pages/RoleSelect.css` 文件，移除 RoleSelect.tsx 中的 import [US-003]
- [ ] 2.5 验证：页面加载后 `#root` 无 1126px 宽度约束，antd 组件占满可用宽度

## 3. Layout 重构

> 依赖：1, 2

- [ ] 3.1 重构 `apps/web/src/components/Layout.tsx`：使用 antd `Layout` + `Layout.Header` + `Layout.Content` 替换手写布局，Header 中用 antd `Button` 做"切换角色" [WF-002]
- [ ] 3.2 验证：进入工作台后 Header 显示当前角色名称和"切换角色"按钮，点击可跳转回角色选择页

## 4. 角色选择页重构

> 依赖：1, 2

- [ ] 4.1 重构 `apps/web/src/pages/RoleSelect.tsx`：使用 antd `Row` / `Col` + 3 个 `Card`（`hoverable`）展示角色选项，替换原有按钮 [WF-001]
- [ ] 4.2 验证：角色选择页显示 3 个 Card，点击可跳转到对应工作台

## 5. 提交者工作台重构

> 依赖：1, 3

- [ ] 5.1 重构 `apps/web/src/pages/SubmitterWorkbench.tsx`：创建工单表单用 antd `Form` + `Form.Item` + `Input` + `Input.TextArea` + `Button`（title 字段 `rules: [{ required: true }]`） [WF-003]
- [ ] 5.2 工单列表用 antd `Table`（`pagination={false}`）替换手写 `<table>`，columns 定义：标题、状态（`Tag`）、创建时间 [WF-003, WF-009, US-007]
- [ ] 5.3 错误提示通过 `AntdApp.useApp()` 获取 `message` 实例，调用 `message.error()` [WF-003, US-006]
- [ ] 5.4 验证：可创建工单、列表仅显示 createdBy === "submitter" 的工单、title 为空时表单验证拦截、API 失败时 message 提示

## 6. 调度者工作台重构

> 依赖：1, 3

- [ ] 6.1 重构 `apps/web/src/pages/DispatcherWorkbench.tsx`：工单列表用 antd `Table`（`pagination={false}`），操作列对 submitted 工单显示 antd `Select`（选项 `completer`）+ `Button` "指派" [WF-004, US-007]
- [ ] 6.2 assigned 工单操作列显示 "已指派给 {assignedTo}" 文本，in_progress 工单显示 "处理中" 文本 [WF-004]
- [ ] 6.3 空状态用 antd `Empty` 替换手写提示 [WF-004]
- [ ] 6.4 错误提示通过 `AntdApp.useApp()` 获取 `message` 实例 [WF-004, US-006]
- [ ] 6.5 验证：可指派 submitted 工单、已指派工单显示指派人文本、无工单时显示 Empty、API 失败时 message 提示

## 7. 完成者工作台重构

> 依赖：1, 3

- [ ] 7.1 重构 `apps/web/src/pages/CompleterWorkbench.tsx`：工单列表用 antd `Table`（`pagination={false}`），操作列对 assigned 工单显示 `Button` "开始处理"，对 in_progress 工单显示 `Button` "完成" [WF-005, US-007]
- [ ] 7.2 错误提示通过 `AntdApp.useApp()` 获取 `message` 实例 [WF-005, US-006]
- [ ] 7.3 验证：可开始处理/完成工单、不显示非自己的工单、API 失败时 message 提示

## 8. 状态 Tag 统一

> 依赖：5, 6, 7

- [ ] 8.1 确认三个工作台的 status 列均使用 antd `Tag` 组件，颜色映射：submitted→blue, assigned→gold, in_progress→orange, completed→green [WF-009]
- [ ] 8.2 验证：4 种状态的工单在 Table 中分别显示对应颜色的 Tag

## 9. 现有测试适配

> 依赖：4, 5, 6, 7（所有页面重构完成后）

- [ ] 9.1 适配 `apps/web/src/__tests__/RoleSelect.test.tsx`：在测试 wrapper 中添加 antd `AntdApp` provider，调整 DOM 查询方式以匹配 antd Card 渲染结构，保留原有 4 个测试用例的验证逻辑 [US-005]
- [ ] 9.2 适配 `apps/web/src/__tests__/workbench.test.tsx`：在测试 wrapper 中添加 antd `AntdApp` provider（`AntdApp.useApp()` 需要），调整 `getAllByRole('row')` 等查询以匹配 antd Table 渲染结构，保留原有 3 个过滤测试的验证逻辑 [US-005]
- [ ] 9.3 验证：`pnpm test` 通过，所有测试用例绿

## 10. 集成验证

> 依赖：8, 9

- [ ] 10.1 运行 `pnpm check`（build + test + lint），确认全部通过
- [ ] 10.2 浏览器完整走通 Demo 流程：创建工单 → 指派 → 开始处理 → 完成，确认功能无回归
