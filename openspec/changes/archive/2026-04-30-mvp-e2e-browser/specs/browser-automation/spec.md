# browser-automation Specification

## Purpose
Playwright 浏览器自动化能力规范——驱动 Chromium 浏览器，捕获 console/network 日志，支持 E2E 测试和独立诊断两种使用模式。

## ADDED Requirements

### Requirement: BA-001 Playwright 浏览器自动化基础设施

项目 SHALL 配置 Playwright 作为浏览器自动化基础设施，使用 Chromium 浏览器，配置文件位于 `tests/e2e/playwright.config.ts`。支持 E2E 测试模式（headless，跑 `.spec.ts`，断言 pass/fail）和诊断模式（有头浏览器，实时抓包，人工交互）。

#### Scenario: 运行浏览器 E2E 测试

- **WHEN** 在根目录执行 `E2E_BASE_URL=http://localhost:5173 pnpm e2e`
- **THEN** Playwright SHALL 启动 Chromium（headless 模式），运行 `tests/e2e/` 下所有 `.spec.ts` 文件，输出通过/失败计数，退出码反映测试结果

#### Scenario: 测试远程环境

- **WHEN** 在根目录执行 `E2E_BASE_URL=https://ai-exam-openspec-ticketflow.ethan1-jiang.workers.dev pnpm e2e`
- **THEN** Playwright SHALL 对所有页面请求使用该 base URL，测试流程与 local 一致

#### Scenario: 独立诊断模式

- **WHEN** 在根目录执行 `E2E_BASE_URL=https://ai-exam-openspec-ticketflow.ethan1-jiang.workers.dev pnpm e2e:diagnose`
- **THEN** SHALL 启动有头 Chromium（`headless: false`），导航到该 URL
- **AND** 浏览器窗口 SHALL 保持打开直到用户手动关闭（`Ctrl+C` 或关闭浏览器窗口）
- **AND** 终端 SHALL 实时输出所有 `[browser console]` 和 `[network]` 请求/响应详情
- **AND** 不同于测试模式，SHALL NOT 执行任何断言或测试用例

#### Scenario: 诊断模式目标不可达时的错误处理

- **WHEN** 诊断模式启动
- **AND** 目标 URL 返回连接错误或 HTTP 5xx
- **THEN** 终端 SHALL 输出明确错误信息（如 `连接失败: <url>` + 具体原因）
- **AND** 浏览器 SHALL 保持打开，不自动关闭（用户可手动改 URL 重试）

#### Scenario: playwright.config.ts 位置

- **WHEN** Playwright 测试模式启动
- **THEN** SHALL 从 `tests/e2e/playwright.config.ts` 读取配置，不依赖根目录配置文件

#### Scenario: scripts 完整性

- **WHEN** 开发者查看 `package.json` scripts
- **THEN** SHALL 存在 `e2e`、`e2e:local`、`e2e:remote`、`e2e:diagnose` 四个浏览器自动化脚本

### Requirement: BA-002 浏览器日志与网络捕获

E2E 测试模式和诊断模式 SHALL 均自动捕获浏览器 console.log 和 network 请求/响应详情。测试失败或诊断退出时自动保存截图。

#### Scenario: 测试模式捕获 console.log

- **WHEN** E2E 测试运行时前端代码调用 `console.log('debug info')`
- **THEN** Playwright SHALL 将该日志输出到测试 stdout，标注 `[browser console]` 前缀

#### Scenario: 诊断模式实时展示网络请求

- **WHEN** 诊断模式正在运行
- **AND** 浏览器发起任意 HTTP 请求
- **THEN** 终端 SHALL 实时输出该请求的 URL、method、status code、response headers、response body

#### Scenario: 测试失败自动截图

- **WHEN** 任意 Playwright 测试断言失败
- **THEN** SHALL 自动保存失败时刻的浏览器截图到 `tests/e2e/screenshots/` 目录

#### Scenario: 诊断模式退出时保存截图

- **WHEN** 诊断模式用户通过 `Ctrl+C` 退出或关闭浏览器
- **THEN** SHALL 保存当前页面的全屏截图到 `tests/e2e/screenshots/diagnose-<timestamp>.png`

### Requirement: BA-003 登录流程 E2E 测试

项目 SHALL 包含浏览器级登录流程测试，通过真实用户交互完成登录，不通过 cookie 注入绕过 UI。

#### Scenario: 表单式登录成功跳转

- **WHEN** 浏览器访问 `/login`
- **AND** 在用户名输入框输入 `admin`
- **AND** 在密码输入框输入 `admin`
- **AND** 点击「登录」按钮
- **THEN** SHALL 等待 URL 包含 `/workbench/admin`
- **AND** 页面 SHALL 包含「管理员」或「用户管理」文本

#### Scenario: 错误密码显示错误提示

- **WHEN** 浏览器访问 `/login`
- **AND** 在用户名输入框输入 `admin`
- **AND** 在密码输入框输入 `wrongpassword`
- **AND** 点击「登录」按钮
- **THEN** 页面 SHALL 显示错误消息（如「密码错误」）
- **AND** URL SHALL 仍为 `/login`

#### Scenario: 空用户名提交显示验证错误

- **WHEN** 浏览器访问 `/login`
- **AND** 用户名为空
- **AND** 密码输入 `changeme`
- **AND** 点击「登录」按钮或按 Enter
- **THEN** 页面 SHALL 显示「请输入用户名」验证提示

#### Scenario: 空密码提交显示验证错误

- **WHEN** 浏览器访问 `/login`
- **AND** 用户名输入 `admin`
- **AND** 密码为空
- **AND** 点击「登录」按钮或按 Enter
- **THEN** 页面 SHALL 显示「请输入密码」验证提示

#### Scenario: 登录后 cookie 持久化

- **WHEN** 登录成功后
- **AND** 浏览器通过 `page.goto('/workbench/admin')` 重新访问
- **THEN** SHALL 成功加载管理员工作台（cookie 被浏览器存储并携带）

### Requirement: BA-004 角色路由 E2E 测试

项目 SHALL 覆盖三角色登录后自动跳转到对应工作台，以及非授权角色访问被拒绝的场景。

#### Scenario: submitter 登录跳转到提交者工作台

- **WHEN** 使用 `submitter` / `changeme` 登录
- **THEN** URL SHALL 变为 `/workbench/submitter`
- **AND** 页面 SHALL 显示「提交」或工单创建表单

#### Scenario: dispatcher 登录跳转到调度者工作台

- **WHEN** 使用 `dispatcher` / `changeme` 登录
- **THEN** URL SHALL 变为 `/workbench/dispatcher`
- **AND** 页面 SHALL 显示待指派工单列表或「指派」按钮

#### Scenario: 非授权角色访问被重定向

- **WHEN** submitter 登录后手动导航到 `/workbench/admin`
- **THEN** URL SHALL 自动跳转为 `/workbench/submitter`

### Requirement: BA-005 工单流转 E2E 测试

项目 SHALL 覆盖完整工单生命周期：提交 → 指派 → 处理 → 完成，通过浏览器交互完成全流程。

#### Scenario: submitter 创建工单

- **WHEN** 以 submitter 身份登录
- **AND** 填写工单标题「E2E Test Ticket」
- **AND** 填写描述「Created by Playwright」
- **AND** 点击「提交」按钮
- **THEN** 工单列表 SHALL 出现标题为「E2E Test Ticket」的条目

#### Scenario: dispatcher 指派工单

- **WHEN** 以 dispatcher 身份登录
- **AND** 存在一条 status 为 `submitted` 且 assignee 为空的工单
- **AND** 通过下拉选择指派人 `completer`
- **AND** 点击「指派」按钮
- **THEN** 该工单 SHALL 显示 `assigned_to` 为 completer

#### Scenario: completer 完成工单

- **WHEN** 以 completer 身份登录
- **AND** 存在一条指派给 completer 的工单
- **AND** 点击「开始处理」
- **AND** 等待状态变为 `in_progress`
- **AND** 点击「完成」
- **THEN** 工单状态 SHALL 变为 `completed`
