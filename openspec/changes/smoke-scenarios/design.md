## Context

browser-smoke skill（`/browser-smoke`）已经交付——它是一个通用的浏览器存活检测工具：打开 URL → 测速 → 扫 DOM → 半随机点击 → 报告。但它不登录、不走业务流、不验证特定功能。

TicketFlow 是个工单流程系统，有三个角色（submitter/dispatcher/completer/admin）。我们需要验证：
- 登录页能不能登录
- 不同角色登录后能不能看到对应的工作台
- 工单创建 → 指派 → 处理 → 完成 这条核心链路能不能通

这些是**精确的场景测试**，不是半随机探测。现有 `tests/e2e/` 有 Playwright 的精确测试但依赖 test runner + assertion。场景冒烟介于两者之间——比 browser-smoke 精确，比 E2E 轻量。

```
browser-smoke ─── 通用存活检测（半随机点击，不登录）
smoke-scenarios ─ 精确场景测试（按步骤操作，角色登录，验证结果）
tests/e2e/ ─────── 精确 E2E 测试（Playwright test runner，带断言）
```

## Goals / Non-Goals

**Goals:**
- 定义场景文件格式（MD），coding agent 可读、可解析、可执行
- 新增 skill `/smoke-scenario`，接收场景名执行冒烟场景
- 覆盖三个核心场景：登录验证、单角色操作、多角色流转
- 每个场景有明确的步骤和期望结果
- 产出场景级报告到 `tests/smoke/`（和场景定义同目录）

**Non-Goals:**
- 不改 browser-smoke skill
- 不做带断言的自动化测试（那是 tests/e2e/ 的职责）
- 不支持复杂条件分支（if/else 流控留给 coding agent 自己判断）
- 不写独立的 .mjs 脚本引擎（场景执行由 coding agent 直接调 Playwright）

## Decisions

### Decision 1: 场景是 MD 文档，不是脚本

场景文件是纯 Markdown，不包含可执行代码。coding agent 读 MD → 理解意图 → 用 Playwright 执行。

**理由**: 场景定义与执行实现解耦。MD 可以被任何 agent（Claude、GPT、人类）理解和执行，不绑死特定的脚本引擎。

**备选**: 写 .mjs 脚本。但那样需要维护脚本引擎、解析器、DSL 语法——过度设计。

### Decision 2: 场景文件格式

每个场景 MD 遵循固定结构，用 YAML frontmatter + Markdown body：

```markdown
---
name: login
description: 登录页验证——admin 用户登录后应跳转到管理员工作台
role: admin
steps:
  - action: goto
    path: /login
  - action: fill
    selector: input[placeholder*="用户名"]
    value: admin
  - action: fill
    selector: input[placeholder*="密码"]
    value: admin
  - action: click
    selector: button:has-text("登")
  - action: wait
    selector: h1, .ant-table, "用户管理"
    timeout: 10000
  - action: check
    url: /workbench/admin
    contains: 用户管理
expect:
  url: /workbench/admin
  contains: 用户管理
  noError: true
---

# 登录页验证

验证 admin 用户能正常登录并跳转到管理员工作台。
```

Frontmatter 给机器解析，Markdown body 给人类阅读。

**理由**: frontmatter 结构化可解析，body 人可读。每个字段都有明确语义，agent 不需要猜测。

### Decision 3: Skill 入口设计

新增 skill `/smoke-scenario`，位于 `.claude/skills/smoke-scenario/SKILL.md`。

命令设计：

| 输入 | 动作 |
|------|------|
| `/smoke-scenario` | 列出 `tests/smoke/` 下所有可用场景 |
| `/smoke-scenario <name>` | 读取场景文件，用 Playwright 逐步执行 |
| `/smoke-scenario <name> --headed` | 打开可见浏览器执行 |
| `/smoke-scenario <name> --url <url>` | 覆盖目标 URL（默认 localhost:5173） |
| `/smoke-scenario <name> --wait MS` | 每步后额外等待 MS 毫秒（默认 500） |
| `/smoke-scenario all` | 依次执行所有场景 |

Skill 不调用 browser-smoke.mjs 脚本——它直接 import Playwright chromium API，复用 browser-smoke 的 Playwright 使用模式（裸调 API、错误收集、报告生成）。

**理由**: 场景执行与通用冒烟的职责不同。browser-smoke 做四阶段半随机探测，scenario smoke 做精确步骤验证。两个 skill 共享同一个 Playwright 依赖，但互不调用。

### Decision 4: 报告格式

场景报告产出到 `tests/smoke/<name>-<timestamp>.md`，和场景定义同目录，中文格式：

```markdown
# 冒烟场景报告: login
- 时间: 2026-06-13T...
- URL: http://localhost:5173
- 角色: admin

## 执行步骤
1. ✅ goto /login — 200
2. ✅ fill input[placeholder*="用户名"] = admin
3. ✅ fill input[placeholder*="密码"] = admin
4. ✅ click button:has-text("登")
5. ✅ wait 10000ms — URL changed to /workbench/admin
6. ✅ check contains "用户管理" — found

## 结果
🟢 通过 — 4/4 步骤成功，登录流程正常
```

每步记录成功/失败，最后给出综合判定。由 coding agent 在执行为过程中实时生成。

### Decision 5: 不新增 npm 依赖

复用已有 `@playwright/test` 的 chromium launcher，与 browser-smoke 一样。

### Decision 6: 与 browser-smoke 的共享

场景执行复用的模式（来自 browser-smoke.mjs）：
- `import { chromium } from '@playwright/test'` + `chromium.launch({ headless })`
- console error 收集 (`page.on('console', ...)`)
- network 4xx/5xx 收集 (`page.on('response', ...)`)
- antd error 检测 (`.ant-message-error`)
- 白屏检测

这些模式不抽成共享库——保持 browser-smoke.mjs 独立，coding agent 在新 skill 上下文里自由使用相同的 Playwright API 模式。

### Decision 7: 多角色切换与 SPA 等待

**多角色切换**: 场景 frontmatter 的 `role` 字段定义初始登录角色。需要切换角色时，steps 中使用 `logout` 和 `relogin` action：
- `logout`: 登出当前用户，等页面跳到登录页
- `relogin`: 用指定的 `role`（和可选 `password`）重新登录

Full-flow 场景通过 `relogin submitter → 操作 → logout → relogin dispatcher → 操作 → logout → relogin completer` 完成三角色流转。

**SPA 等待**: 远端部署有 cold start，browser-smoke 的经验是默认等 5s。场景 skill 支持 `--wait MS` 参数，设置步骤间的额外等待时间（默认 500ms）。对于部署 URL 场景，建议 `--wait 3000`。

**理由**: browser-smoke 用 `--wait` 解决 SPA 冷启动问题，场景执行也一样需要。`logout`/`relogin` 比定义一个复杂的多段 role 结构简单——只是两个新 step action，格式一致。

## Risks / Trade-offs

- **[风险] coding agent 执行不一致**: 同一个场景文件，不同的 agent 或不同时刻执行可能产生细微差异。→ 场景 frontmatter 尽可能结构化和精确，减少歧义。
- **[风险] 场景文件与 UI 耦合**: UI 文案变化（如按钮文字改了）会导致场景失效。→ 场景 selector 优先用语义标签（placeholder、role、has-text），不依赖 CSS class。
- **[权衡] 不写脚本引擎 vs 可复用性**: coding agent 直接调 Playwright 灵活但每次都要"理解"场景。→ 场景格式足够结构化，理解成本低。如果以后要写脚本引擎，frontmatter 可直接被解析器消费。

## Open Questions

1. **场景数据库状态依赖**: 全流程场景（创建→指派→完成）需要数据库有预设用户。是否依赖项目已有的 seed 数据（admin/submitter/dispatcher/completer），还是场景自己在第一步创建测试数据？
2. **场景执行顺序依赖**: `all` 模式时，场景间是否有依赖（如"多角色流转"依赖"创建工单"先跑）？是否每个场景完全独立、自己 setup？
3. **远端 vs 本地**: 场景默认测 localhost 还是 Cloudflare 部署 URL？用 `--url` 参数覆盖，类似于 browser-smoke 的模式？
