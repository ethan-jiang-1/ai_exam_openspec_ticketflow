## Context

本 change 的交付物是一个 **Claude Code skill**（`/browser-smoke`），不是传统的代码模块。它的用户体验是：

```
用户: /browser-smoke https://xxx.workers.dev
Claude: 正在检测...
        
        🟢 TicketFlow 部署正常
        加载 2.3s（正常）| 12 个可交互元素 | 点击 8 处全部正常
        无 console error，无网络错误
        报告已保存到 data/smoke-reports/2026-06-13T14-32-05.json
```

skill 的底层是一个 Playwright 脚本 `.claude/skills/browser-smoke/scripts/browser-smoke.mjs`，但它只是引擎——用户不直接跟脚本交互，全部通过 skill。脚本也可以脱离 skill 独立运行（CI、cron），但日常使用的入口是 skill。

TicketFlow 当前有三层测试/验证手段，本 change 填补的空白是**用真实浏览器打开部署 URL，粗略判断是否存活**：

## Goals / Non-Goals

**Goals:**
- 交付一个 Claude Code skill `/browser-smoke`，用户通过它与冒烟测试交互
- 支持 on/off 开关：`/browser-smoke on` 启用、`/browser-smoke off` 关闭，状态持久化
- skill 底层调用 Playwright 脚本，测速、读 DOM、半随机点击、收集错误
- 报告落盘到 `data/smoke-reports/<timestamp>.json`，可回查历史
- 脚本可脱离 skill 独立运行（`pnpm smoke`），输出 JSON 到 stdout + 文件

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

### Decision 4: 报告格式 — JSON to stdout + 双文件落盘

脚本输出结构化 JSON 到 stdout（供管道消费），同时将报告写入 `data/smoke-reports/` 目录下两份文件：`<timestamp>.json`（机器可读）和 `<timestamp>.md`（人可读中文报告）。

JSON 关键字段：

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
    "visibleTextSample": ["...", "..."],
    "interactiveCount": 12,
    "interactiveBreakdown": { "buttons": 3, "links": 5, "inputs": 2, "selects": 1, "menuItems": 1 },
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

### Decision 5: Skill 是主交付物，脚本是引擎

Skill（`.claude/skills/browser-smoke/SKILL.md`）是本 change 的主要交付物，用户通过 `/browser-smoke` 与整个冒烟测试系统交互。脚本 `.claude/skills/browser-smoke/scripts/browser-smoke.mjs` 是底层引擎——负责浏览器自动化、数据采集、报告生成，但它不直接面向用户。

Skill 的职责：
1. 接收用户输入（URL 可选、on/off/status/default-url 命令、额外参数）
2. 管理状态文件 `.browser-smoke-state.json`（on/off 开关 + 默认 URL）
3. 未传 URL 时使用状态文件中的 `defaultUrl`（项目部署地址）
4. 调用脚本 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url> ...`
5. 读 JSON 输出，翻译成中文报告呈现给用户
6. 告知用户报告文件落盘位置

**理由**: skill 是用户体验层，脚本可脱离 skill 独立运行（CI、cron 等场景）。两者通过 JSON 耦合——脚本只管产出结构化数据，skill 管解读和呈现。

### Decision 6: 依赖 — 复用已有 Playwright

不新增 npm 依赖。`@playwright/test` 已在 devDependencies 中，其 `playwright` 或 `playwright-core` 可直接 import chromium。

**理由**: 遵循「新增依赖必须显式 task」的约定——既然已经装了 Playwright，直接复用即可。如果 playwright-core 未安装，加一个 task 检查。

### Decision 7: On/Off 开关 + 默认 URL

Skill 状态文件 `.browser-smoke-state.json` 存储两项配置：开关状态和默认测试 URL。

```json
{
  "enabled": true,
  "defaultUrl": "https://ai-exam-openspec-ticketflow.ethan1-jiang.workers.dev"
}
```

Skill 指令：

```
/browser-smoke on                   → 启用
/browser-smoke off                  → 关闭
/browser-smoke status               → 显示当前状态和默认 URL
/browser-smoke                      → 使用 defaultUrl 执行冒烟（无参数时）
/browser-smoke <url>                → 用指定 URL 执行（覆盖默认）
/browser-smoke default-url <url>    → 修改默认 URL
```

状态文件由 skill 指令中的 Claude 负责读写，脚本不感知。默认 URL 初始值设为项目的 Cloudflare Workers 部署地址。

**理由**: 用户的主要测试目标是自己的部署 URL，每次手打很烦。skill 记住它，`/browser-smoke` 回车即测。同时保留手动指定 URL 的灵活性。

### Decision 8: 报告双格式输出

脚本每次运行产出**两份报告**，放在 `data/smoke-reports/`：

```
data/smoke-reports/
├── 2026-06-13T14-32-05.json    ← 机器可读的结构化数据
└── 2026-06-13T14-32-05.md      ← 人可读的中文报告
```

- **JSON 报告**：完整结构化数据，供 CI 解析、脚本消费、skill 解读
- **Markdown 报告**：中文叙述，包含加载速度总结、页面内容摘要、交互探测详情、异常列表、综合判定。人直接打开就能看，不依赖 Claude

Skill 完成测试后告知用户两份报告的路径。当用户说"给我看报告"时，skill 直接读 Markdown 版呈现。

**理由**: JSON 适合机器，但对人不友好。一份中文 Markdown 报告让人不用 Claude 也能直接看结果，也方便存档、分享、对比历史。

`data/smoke-reports/` 目录加入 `.gitignore`，不提交到仓库。

## Risks / Trade-offs

- **[风险] 半随机点击可能触发副作用**（如误点删除按钮）→ 因为 smoke 只测部署环境，用 seed 数据，不会有真实数据。如果担心，可通过 `--readonly` 标志只点不会产生写操作的元素（a、menu-item，不点 button[type="submit"]）。
- **[风险] Playwright 依赖的 Chromium 可能在新环境未安装** → 在脚本开头做 `chromium.launch()` 的 try-catch，失败时给出明确的安装指引（`npx playwright install chromium`）。
- **[权衡] 不登录 vs 登录** → 第一版不自动登录，只测未登录态的页面（登录页渲染、表单验证等）。以后可加 `--login <role>` 参数让 smoke 先登录再逛。这样第一版保持简单。
- **[权衡] 测速阈值写死** → firstByte > 3000ms 判 slow，domReady > 5000ms 判 slow。这些阈值对 Cloudflare Workers 部署可能过严，但作为初始值合理——以后可以 `--threshold` 参数覆盖。

## Open Questions

1. **Markdown 报告模版**: 人可读报告应该包含哪些章节、什么格式？是否需要类似"建议"section（如"加载慢，建议检查 Cloudflare cache 配置"）？
2. **报告保留策略**: `data/smoke-reports/` 是否会无限增长？是否需要 `--keep N` 参数自动清理旧报告，或手动清理即可？
3. **与 e2e-smoke.mjs 的关系**: 两个 smoke 工具并存（一个 API、一个浏览器），是否要统一命名或合并入口？当前暂定独立存在，但后续可能需要一个 `pnpm smoke` 同时跑两者。
