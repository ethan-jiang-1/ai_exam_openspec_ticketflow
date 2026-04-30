## Why

当前项目只有 API 级自动化测试（`scripts/e2e-smoke.mjs`），没有真实浏览器。前端 UI 在 Chromium 中的行为——antd 表单渲染、cookie 存储与传递、登录跳转、错误提示——从未被自动化验证。Cloudflare 部署后登录失败，curl 超时无法排查，只能人眼在浏览器里试。

引入 Playwright 建立**浏览器自动化**这个独立能力。它最大的消费者是 E2E 测试（自动化验证登录+路由+工单流转），但它也是一个独立工具——可以打开浏览器浏览部署站点、实时查看 console / network 抓包、保存截图和 trace，用来诊断任何线上问题。

## What Changes

- 新增 `@playwright/test` 为根目录 devDependency，安装 Chromium 浏览器二进制
- 新建 `tests/e2e/` 目录：Playwright config、测试规格、fixtures、screenshots
- 编写 E2E 测试套件（登录 → 角色路由 → 工单流转），通过 `pnpm e2e` 运行
- 支持通过 `E2E_BASE_URL` 环境变量切换目标（本地 `localhost:5173` 或 Cloudflare 域名）
- 测试运行时自动捕获浏览器 console 和 network 请求/响应，失败自动截图
- 新建 `scripts/e2e-diagnose.mjs`：独立诊断脚本，打开浏览器访问远程站点，交互式保留浏览器窗口供人工排查，输出所有抓包信息（不跑测试，纯诊断工具）
- 新增 `pnpm e2e` / `pnpm e2e:local` / `pnpm e2e:remote` / `pnpm e2e:diagnose` 四个脚本

## Capabilities

### New Capabilities

- `browser-automation`: Playwright 浏览器自动化基础设施——启动 Chromium、发起请求、捕获 console/network、截图/trace。是 E2E 测试和远程诊断的共同基础。缩写 `BA`

### Modified Capabilities

- `dev-tooling`: DT-003 需新增 MODIFIED delta——Vitest 测试框架职责明确为"单元/组件/API 集成测试"，与 Playwright 浏览器 E2E 区分

## Impact

- `package.json`（根）: 新增 `@playwright/test` devDependency + `e2e`/`e2e:local`/`e2e:remote`/`e2e:diagnose` 四个脚本
- `pnpm-lock.yaml`: 依赖锁更新
- `.gitignore`: 新增 `test-results/`、`playwright-report/`、`tests/e2e/screenshots/` 忽略规则
- `tests/e2e/`: 新目录，包含 `playwright.config.ts`、`login.spec.ts`、`routing.spec.ts`、`workflow.spec.ts`、`fixtures/`、`screenshots/`
- `scripts/e2e-diagnose.mjs`: 独立诊断工具——启动有头浏览器、访问指定 URL、捕获所有 console/network 输出、浏览器保持打开供人工查看
- `openspec/config.yaml`: 注册 BA capability 缩写
- `openspec/specs/dev-tooling/spec.md`: DT-003 MODIFIED delta
- `openspec/specs/browser-automation/spec.md`: 新建 capability spec
