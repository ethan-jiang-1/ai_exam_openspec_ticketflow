# browser-automation Specification (Delta)

## ADDED Requirements

### Requirement: BA-006 Smoke 测试模式

Playwright 浏览器自动化基础设施 SHALL 支持第三种使用模式：smoke test 模式。该模式区别于 E2E 测试模式（带断言的 pass/fail）和诊断模式（人工交互），用于对已部署的 URL 执行粗粒度的存活检测。Smoke 模式通过 `.claude/skills/browser-smoke/scripts/browser-smoke.mjs` 实现，直接调用 Playwright 的 chromium API 而非通过 test runner。

#### Scenario: Smoke 模式区别于 E2E 测试模式

- **WHEN** 执行 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url>`
- **THEN** SHALL 启动 headless Chromium（与 E2E 测试一致）
- **AND** SHALL NOT 使用 `@playwright/test` 的 test runner（test/describe/expect）
- **AND** SHALL NOT 读取 `tests/e2e/playwright.config.ts`
- **AND** SHALL 执行 LOAD → SCAN → EXPLORE → REPORT 四个阶段
- **AND** SHALL 输出结构化 JSON 报告到 stdout

#### Scenario: Smoke 模式区别于诊断模式

- **WHEN** 执行 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url>`
- **THEN** SHALL 自动完成全部探测后退出，不保持浏览器打开
- **AND** SHALL 有明确的 pass/fail 判定（verdict + exit code）
- **AND** SHALL NOT 需要人工交互

#### Scenario: Smoke 模式复用 Playwright 依赖

- **WHEN** 项目安装了 `@playwright/test`（已有 devDependency）
- **THEN** SHALL 直接使用其内置的 `chromium` launcher（`import { chromium } from '@playwright/test'` 或 `playwright-core`）
- **AND** SHALL NOT 新增 npm 依赖

### Requirement: BA-007 Smoke 测试报告与退出码

Smoke 测试模式 SHALL 输出结构化 JSON 报告，并通过退出码反映检测结果，使其可在 CI pipeline 中使用。

#### Scenario: JSON 报告输出

- **WHEN** smoke 测试完成
- **THEN** stdout SHALL 包含完整的 JSON 报告，包含 `url`、`timestamp`、`timing`、`pageContent`、`errors`、`explorations`、`verdict` 字段

#### Scenario: 退出码约定

- **WHEN** smoke 脚本退出
- **THEN** exit code SHALL 为：
  - `0`：部署健康或仅有警告
  - `1`：检测到异常（console error、network error、白屏等）
  - `2`：脚本自身错误（环境问题、参数错误等）

#### Scenario: CI 集成

- **WHEN** smoke 脚本在 CI pipeline 中执行
- **THEN** CI SHALL 可通过 exit code 判断部署状态（0 = pass）
- **AND** SHALL 可解析 JSON 报告的 `verdict` 字段获取人类可读的判定

#### Scenario: `pnpm smoke` 快捷脚本

- **WHEN** 开发者在根目录执行 `pnpm smoke -- --url <url>`
- **THEN** SHALL 等价于执行 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url>`
- **AND** package.json 的 `scripts` 中 SHALL 包含 `"smoke": "node .claude/skills/browser-smoke/scripts/browser-smoke.mjs"`
