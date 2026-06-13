## Context

TicketFlow 当前有三层测试/验证手段：

```
API 层                    浏览器层
──────                    ────────
e2e-smoke.mjs             tests/e2e/*.spec.ts        e2e-investigate-remote.mjs
fetch 调 API              Playwright test runner     Playwright 裸调
完整断言 ✅                精确断言 ✅                 无断言 ❌
自己启动 server           默认连 localhost            调查远程部署
```

`e2e-smoke.mjs` 最接近"部署后验证"的形态——20+ 个完整断言，pass/fail 计数，exit code。但它不碰浏览器，验证不了前端构建是否正确、JS 是否加载、antd 组件是否渲染。`e2e-investigate-remote.mjs` 能用浏览器打开远程部署，但它只是诊断工具，没有 pass/fail 判断。

缺失的是一个**用真实浏览器打开部署 URL，粗略判断是否存活**的工具。

## Goals / Non-Goals

**Goals:**
- 脚本用 Playwright 打开任意 URL，获取 Navigation Timing 测速
- 读取 DOM 内容摘要（可见文本、可交互元素列表、是否有错误关键词）
- 半随机选择可交互元素点击，观察每次点击后是否有异常（console error、network 4xx/5xx、antd error message、白屏）
- 输出结构化 JSON 报告到 stdout，exit code 反映结果
- Claude Code skill 包装：调用脚本、解读 JSON、用自然语言汇报给用户

**Non-Goals:**
- 不做精确的 E2E 断言（那是 tests/e2e/ 的职责）
- 不启动本地 server（只测已经部署的目标）
- 不支持复杂交互流程（登录 → 创建 → 指派 等精确流程留给 E2E 测试）
- 不做性能基准对比，只做一次性快照

## Decisions

### Decision 1: Playwright 直接调 API，不用 test runner

`@playwright/test` 已经作为 devDependency 安装。但 smoke 脚本不用它的 test runner（describe/test/expect），而是直接 `import { chromium }` 裸调。

**理由**: smoke test 不需要 fixture、parallel、reporter 等 test runner 特性。它是一个线性脚本：打开 → 观察 → 点击 → 报告。直接调 API 更灵活（可以任意中间截图、动态改策略），且不依赖 `playwright.config.ts`。

**备选**: 用 `@playwright/test` 写成一个 spec 文件。但那样受限于 test runner 的生命周期，不适合作为独立工具从 CLI 或 skill 调用。

### Decision 2: 脚本架构 — 单次执行，分阶段

脚本一次运行完成所有探测，不做交互式 session（不做 server 模式保持浏览器存活）。分四个阶段：

```
Phase 1: LOAD     — 导航到 URL，收集 Navigation Timing + 首屏信息
Phase 2: SCAN     — 提取 DOM 内容摘要 + 错误检测
Phase 3: EXPLORE  — 半随机选择 N 个元素点击，每点一次记录结果
Phase 4: REPORT   — 汇总输出 JSON
```

**理由**: 简单可靠。如果以后需要交互式，可以在 Phase 3 后加 `--interactive` 模式暂停。

### Decision 3: 半随机点击策略

不是纯随机，而是按优先级选择可交互元素：

```
优先级: button > a > .ant-select-selector > input[type="text"] > .ant-tag > .ant-menu-item
排除: [disabled], [aria-disabled="true"], hidden, 视口外
上限: 默认 8 个，可通过 --clicks N 调整
```

点击后等待 500ms，然后检查：
- `page.url()` 是否变化（导航了）
- DOM 是否有可见变化（element count 差异）
- console 是否有新 error
- network 是否有新 4xx/5xx
- 是否出现 `.ant-message-error`
- 页面是否白屏（`document.body.innerText.trim() === ''`）

**理由**: 优先级保证点到「可能有事发生」的元素，而不是点到空白区。8 个上限保证 30 秒内完成。

### Decision 4: 报告格式 — JSON to stdout

脚本输出单行 JSON（或 `--pretty` 时格式化），关键字段：

```json
{
  "url": "https://...",
  "timestamp": "2026-06-13T...",
  "timing": {
    "firstByte": 320,      // ms, timeToFirstByte
    "domReady": 1200,      // ms, domContentLoaded
    "fullLoad": 2300,      // ms, load complete
    "verdict": "normal"    // "fast" | "normal" | "slow"
  },
  "pageContent": {
    "title": "TicketFlow",
    "visibleTextSample": ["...", "..."],  // 前 20 个可见文本片段
    "interactiveCount": 12,
    "hasErrorKeywords": false
  },
  "errors": {
    "console": [],
    "network": [],
    "antdErrorMessages": []
  },
  "explorations": [
    {
      "selector": "button:has-text('登录')",
      "tagName": "button",
      "visibleText": "登 录",
      "result": "navigated",
      "errors": []
    }
  ],
  "verdict": "healthy"  // "healthy" | "warning" | "unhealthy"
}
```

**理由**: JSON 可被脚本消费（CI pipeline 可解析退出码和字段），同时 Claude 可读 JSON 翻译成人话。

### Decision 5: Skill 定位 — 调用者 + 翻译者

Skill 不实现任何测试逻辑，只做两件事：
1. 调用 `node scripts/browser-smoke.mjs --url <url>` 
2. 读 JSON 输出，翻译成用户可理解的中文报告

**理由**: 保持 skill 薄，逻辑在脚本里。脚本可以脱离 Claude Code 独立跑（CI、cron 等），skill 是用户体验层。

### Decision 6: 依赖 — 复用已有 Playwright

不新增 npm 依赖。`@playwright/test` 已在 devDependencies 中，其 `playwright` 或 `playwright-core` 可直接 import chromium。

**理由**: 遵循「新增依赖必须显式 task」的约定——既然已经装了 Playwright，直接复用即可。如果 playwright-core 未安装，加一个 task 检查。

## Risks / Trade-offs

- **[风险] 半随机点击可能触发副作用**（如误点删除按钮）→ 因为 smoke 只测部署环境，用 seed 数据，不会有真实数据。如果担心，可通过 `--readonly` 标志只点不会产生写操作的元素（a、menu-item，不点 button[type="submit"]）。
- **[风险] Playwright 依赖的 Chromium 可能在新环境未安装** → 在脚本开头做 `chromium.launch()` 的 try-catch，失败时给出明确的安装指引（`npx playwright install chromium`）。
- **[权衡] 不登录 vs 登录** → 第一版不自动登录，只测未登录态的页面（登录页渲染、表单验证等）。以后可加 `--login <role>` 参数让 smoke 先登录再逛。这样第一版保持简单。
- **[权衡] 测速阈值写死** → firstByte > 3000ms 判 slow，domReady > 5000ms 判 slow。这些阈值对 Cloudflare Workers 部署可能过严，但作为初始值合理——以后可以 `--threshold` 参数覆盖。

## Open Questions

1. **默认点击数量**: 8 个元素是否合适？登录页只有约 3 个可交互元素，Dashboard 有 30+ 个。如果默认值因页面不同差异大，是否需要百分比模式（如 "点击 50% 的可交互元素"）？
2. **是否应该默认登录**: 不登录的情况下只能测登录页，大部分应用逻辑测不到。是否需要 `--login admin:admin` 作为默认行为，让 smoke 能逛到工作台内部？
3. **与 e2e-smoke.mjs 的关系**: 两个 smoke 工具并存（一个 API、一个浏览器），是否要统一命名或合并入口？当前暂定独立存在，但后续可能需要一个 `pnpm smoke` 同时跑两者。
