## Context

当前测试体系有三层：单元测试（vitest，纯逻辑）、集成测试（vitest + app.request()，API 端点）、组件测试（vitest + jsdom + @testing-library/react，mock fetch）。唯一标为"E2E"的 `scripts/e2e-smoke.mjs` 实际上是 API 级集成测试——它启动真实后端但从不打开浏览器。

缺失的是真实浏览器级 E2E：antd 表单在 Chromium 中如何渲染？`POST /api/auth/login` 后 cookie 是否被浏览器存储并携带到后续请求？登录成功后 `navigate(/workbench/<role>)` 是否真的渲染了目标页面？这些只有 Playwright 能回答。

Cloudflare 部署后登录失败，curl 超时无法排查，暴露了这个盲区——远程环境的验证完全依赖人眼。

## Goals / Non-Goals

**Goals:**
- 建立**浏览器自动化**独立能力——Playwright 驱动 Chromium，能浏览、抓包、截图、trace
- 在此能力上构建 E2E 测试套件——覆盖登录表单交互 → 登录成功 → 角色路由 → 工单 CRUD
- 提供**独立诊断工具**——不跑测试，打开有头浏览器访问远程站点，实时呈现 console/network 抓包输出供人工排查（解决 Cloudflare 登录失败排障场景）
- 支持 local（`http://localhost:5173`）和 remote（Cloudflare 域名）双目标
- 不替代现有 vitest 测试，与其互补

**Non-Goals:**
- 不替换 `scripts/e2e-smoke.mjs`（API 级快速烟测仍有价值）
- 不引入视觉回归测试（Visual Regression）
- 不在 CI 中配置 Playwright（Cloudflare Workers Builds 不支持浏览器运行时）
- 不覆盖所有页面——只测登录 + 核心流程

## Decisions

### 1. Playwright 而非 Cypress

Playwright 对 TypeScript 的 native 支持更好，能直接复用项目的 `tsconfig.base.json`，且 `page.on('console')` 和 `page.on('request')` / `page.on('response')` 的调试日志捕获比 Cypress 更直观。不需要额外的 `cy.task()` 来桥接 Node 和浏览器。

### 2. 测试目录：`tests/e2e/`

目录约定已定义此位置（见 context）。不放在 `apps/web/` 下因为 E2E 测试横跨前后端，不属于任一 workspace。不放在 `scripts/` 下因为 `scripts/` 是运维脚本区域。

### 3. 双目标策略：BASE_URL 环境变量

```
# 本地开发
E2E_BASE_URL=http://localhost:5173 pnpm e2e

# Cloudflare 远程
E2E_BASE_URL=https://<domain> pnpm e2e
```

Playwright config 通过 `process.env.E2E_BASE_URL` 读取，默认 `http://localhost:5173`。测试代码不内嵌 URL，全部从 `baseURL` 派生。

### 4. 前端 dev server 复用 `pnpm dev`

不需要新增 `start` 或 `preview` 脚本。E2E 本地测试前需要 `pnpm dev` 先启动（前后端一起启动）。在测试脚本中通过 `webServer` 配置自动启动或手动预先启动。选择手动预先启动——更灵活，用户可以自己决定用什么方式启服务。

### 5. 登录测试策略

不使用 cookie 注入（绕过 UI）。所有登录测试 SHALL 走真实浏览器交互：`page.fill('input[placeholder="请输入用户名"]', username)` → `page.fill('input[placeholder="请输入密码"]', password)` → `page.click('button:has-text("登")')` → 等待 `page.url()` 包含 `/workbench/<role>`。

这与组件测试（mock fetch）形成互补——Playwright 验证真实网络层。

### 6. Playwright config 放在 `tests/e2e/` 内

单文件 `playwright.config.ts`，不污染根目录。配置项：
- `testDir: '.'`
- `use.baseURL` 从 `E2E_BASE_URL` 环境变量读取，默认 `http://localhost:5173`
- `use.browserName: 'chromium'`
- `timeout: 30000`（单个测试 30s 超时）
- `retries: 0`（E2E 应可复现，失败了就是真失败）

### 7. 不引入 ORM seed for E2E

本地 E2E 测试前通过 API 播种（`POST /api/auth/login` + `POST /api/tickets`），不走 ORM 脚本。因为 Playwright 运行在浏览器上下文中，只能通过 HTTP 与服务端交互。远程测试同样的流程。这与"禁止原始 SQL"约定一致。

### 8. 两种使用模式：E2E 测试模式 vs 诊断模式

浏览器自动化能力有两个消费者，对应两种运行模式：

| | E2E 测试模式 | 诊断模式 |
|---|---|---|
| 入口 | `pnpm e2e` | `pnpm e2e:diagnose` |
| 浏览器 | headless（无头） | `headless: false`（有头可视） |
| 行为 | 跑完所有 `.spec.ts`，断言 pass/fail | 打开指定 URL，浏览器保持打开，不做断言 |
| 输出 | Playwright 测试报告 | console/network 实时 stdout + 截图 |
| 用途 | 自动化验证（本地+远程） | 手动排查线上问题 |
| 实现 | `tests/e2e/*.spec.ts` | `scripts/e2e-diagnose.mjs` |

诊断脚本不依赖 Playwright test runner——直接用 `playwright` core API (`chromium.launch()`)，是独立 Node.js 脚本。用户跑 `E2E_BASE_URL=https://xxx.workers.dev pnpm e2e:diagnose`，浏览器窗口打开，Chrome DevTools 般的抓包信息打印到终端，用户可以在浏览器里手动操作同时看到所有网络活动。

## Risks / Trade-offs

- **[Risk] Playwright 安装 Chromium 需要 ~150MB 磁盘空间** → 不影响已有开发流程，`pnpm install` 不会自动下载浏览器（需单独 `pnpm exec playwright install chromium`）
- **[Risk] 远程测试可能因网络问题超时** → 设置 30s 超时 + 失败时自动截图到 `tests/e2e/screenshots/`
- **[Risk] antd 中文文本在 DOM 中可能被 split（如"登 录"）** → 使用 `has-text` 或正则匹配，已在组件测试中验证可行
- **[Risk] E2E 测试耗时较长（~30s+）** → 不在 `pnpm check` 中自动运行，需要手动 `pnpm e2e`
- **[Risk] E2E 测试不可幂等——工作流测试创建真实工单数据，反复运行本地测试会累积「E2E Test Ticket」** → 本地 dev server 重启时会重建 DB（`data/ticketflow.db` 自动 migrate），数据自动清除；远程 D1 需手动在 Console 删除测试工单

## Open Questions

1. **远程环境的 session cookie domain/path 是否与本地一致？** Cloudflare Workers 可能对 cookie 的 `Domain`/`Secure`/`SameSite` 做不同处理，Playwright 会捕获实际 Set-Cookie 头，第一个远程测试跑过就知道差异在哪——这正是引入 Playwright 的价值
2. **是否需要在 CI 中运行 Playwright？** 当前 Cloudflare Workers Builds 不支持，但 GitHub Actions 可以。留到后续决定——当前 priority 是本地能用浏览器排查 + 手动测远程
