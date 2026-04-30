## 1. 基础设施搭建

- [x] 1.1 在根 `package.json` 添加 `@playwright/test` (exact `1.52.0`) 为 devDependency [BA-001]
- [x] 1.2 创建 `tests/e2e/` 目录和 `playwright.config.ts`（Chromium、baseURL 从 `E2E_BASE_URL` env 读取、30s timeout、失败截图到 `tests/e2e/screenshots/`） [BA-001]
- [x] 1.3 在根 `package.json` 添加 `e2e`、`e2e:local`、`e2e:remote`、`e2e:diagnose` 四个脚本 [BA-001]
- [x] 1.4 安装 Playwright Chromium 浏览器二进制（`pnpm exec playwright install chromium`） [BA-001]
- [x] 1.5 创建 `tests/e2e/fixtures/auth.ts`——登录 helper：`login(page, username, password)` 执行完整表单填写+提交+等待跳转 [BA-003]
- [x] 1.6 在 `openspec/config.yaml` capability 编码表注册 `BA = browser-automation` [BA-001]
- [x] 1.7 在 `.gitignore` 中添加 `test-results/`、`playwright-report/`、`tests/e2e/screenshots/` 忽略规则

## 2. 独立诊断工具 [BA-001, BA-002]

- [x] 2.1 创建 `scripts/e2e-diagnose.mjs`——使用 Playwright core API（`chromium.launch({ headless: false })`），从 `E2E_BASE_URL` 读取目标 URL，打开有头浏览器 [BA-001]
- [x] 2.2 诊断脚本中注册 `page.on('console')` 和 `page.on('request')` / `page.on('response')` 监听，实时输出到终端带 `[browser console]` 和 `[network]` 前缀 [BA-002]
- [x] 2.3 诊断脚本在 `Ctrl+C` 退出或关闭浏览器窗口时保存当前页面截图到 `tests/e2e/screenshots/diagnose-<timestamp>.png` [BA-002]
- [x] 2.4 诊断脚本处理目标不可达：输出明确错误信息（`连接失败: <url>` + 原因），浏览器保持打开不自动关闭 [BA-001]

## 3. 登录流程 E2E 测试 [BA-003]

- [x] 3.1 创建 `tests/e2e/login.spec.ts`：测试表单式登录成功跳转（admin/admin → /workbench/admin） [BA-003]
- [x] 3.2 添加测试：错误密码显示错误消息（admin/wrongpassword → 错误提示 + URL 仍为 /login） [BA-003]
- [x] 3.3 添加测试：空用户名提交显示验证错误 [BA-003]
- [x] 3.4 添加测试：空密码提交显示验证错误 [BA-003]
- [x] 3.5 添加测试：登录后 cookie 持久化（登录后 goto('/workbench/admin') 不跳回登录页） [BA-003]

## 4. 角色路由 E2E 测试 [BA-004]

- [x] 4.1 创建 `tests/e2e/routing.spec.ts`：测试 submitter 登录跳转到 /workbench/submitter [BA-004]
- [x] 4.2 添加测试：dispatcher 登录跳转到 /workbench/dispatcher [BA-004]
- [x] 4.3 添加测试：非授权角色访问被重定向（submitter 登录后手动 goto /workbench/admin → 跳回 /workbench/submitter） [BA-004]

## 5. 工单流转 E2E 测试 [BA-005]

- [x] 5.1 创建 `tests/e2e/workflow.spec.ts`：测试 submitter 创建工单（填写标题+描述 → 提交 → 列表出现该工单） [BA-005]
- [x] 5.2 添加测试：dispatcher 指派工单给 completer（下拉选择 → 点击指派 → 验证 assigned_to） [BA-005]
- [x] 5.3 添加测试：completer 处理工单到完成（开始处理 → in_progress → 完成 → completed） [BA-005]

## 6. 测试模式调试日志 [BA-002]

- [x] 6.1 在 `playwright.config.ts` 中配置全局 `page.on('console')` 监听，输出到 stdout 带 `[browser console]` 前缀 [BA-002]
- [x] 6.2 在 `playwright.config.ts` 中配置全局 network 请求/响应监听，非 2xx 响应输出 url + method + status + body [BA-002]
- [x] 6.3 配置 `screenshot: 'only-on-failure'` + `trace: 'retain-on-failure'` [BA-002]

## 7. 集成验证

- [x] 7.1 运行 `pnpm check` 确保不破坏现有 build/test/lint [DT-003]
- [x] 7.2 本地启动 `pnpm dev` → 运行 `E2E_BASE_URL=http://localhost:5173 pnpm e2e` → 全部通过 [BA-001]
- [x] 7.3 运行 `E2E_BASE_URL=https://ai-exam-openspec-ticketflow.ethan1-jiang.workers.dev pnpm e2e:remote` 验证远程环境——全部 11/11 通过 [BA-001]
- [x] 7.4 运行 `E2E_BASE_URL=http://localhost:5173 pnpm e2e:diagnose` 验证诊断模式——浏览器窗口打开、无报错、Ctrl+C 正常退出 [BA-001]
- [x] 7.5 更新 `README.md` 和 `CLAUDE.md`：在命令表新增 `e2e` / `e2e:local` / `e2e:remote` / `e2e:diagnose` 说明
