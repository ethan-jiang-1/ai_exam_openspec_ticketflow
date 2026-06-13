---
name: smoke-scenario
description: 冒烟场景测试——读取 tests/smoke/scenarios/ 下的场景 MD 文件，用 Playwright 逐步执行（登录、填写、点击、验证），产出场景级中文报告
---

# smoke-scenario

场景冒烟测试。读取 `tests/smoke/scenarios/` 下的场景 MD 文件，解析 YAML frontmatter 获取步骤序列和期望结果，用 Playwright 逐步执行，产出中文报告到 `tests/smoke/reports/`。

## 命令

| 输入 | 行为 |
|------|------|
| `/smoke-scenario` | 列出 `tests/smoke/scenarios/` 下所有可用场景（name + description） |
| `/smoke-scenario <name>` | 读取场景文件，用 Playwright 逐步执行 |
| `/smoke-scenario <name> --headed` | 打开可见 Chromium 窗口执行 |
| `/smoke-scenario <name> --url <url>` | 覆盖目标 URL（默认 `http://localhost:5173`） |
| `/smoke-scenario <name> --wait MS` | 每步后额外等待 MS 毫秒（默认 500） |
| `/smoke-scenario all` | 依次执行所有场景，最后给出汇总 |

## 场景文件格式

场景文件位于 `tests/smoke/scenarios/<name>.md`，YAML frontmatter + Markdown body：

```yaml
name: <场景标识>
description: <一句话描述>
role: <初始登录角色，可选>
steps:
  - action: goto          # 导航到 path
    path: /login
  - action: fill           # 填入 selector 对应的输入框
    selector: input[placeholder*="用户名"]
    value: admin
  - action: click          # 点击 selector
    selector: button:has-text("登")
  - action: wait           # 等待 selector 可见 或 timeout 毫秒
    timeout: 10000
    selector: h1           # 可选
  - action: check          # 检查项
    url: /workbench/admin  # 可选，URL 包含此字符串
    contains: 用户管理      # 可选，页面包含此文本
    noError: true          # 可选，无 console/network/antd 错误
  - action: logout         # 登出当前用户
  - action: relogin        # 切换角色重新登录
    role: dispatcher
    password: changeme     # 可选，默认 changeme
expect:
  url: /workbench/admin
  contains: 用户管理
  noError: true
```

## 执行流程

### 1. 列出场景（无参数时）

读取 `tests/smoke/scenarios/` 下所有 `.md` 文件，解析每个文件的 frontmatter，展示 name 和 description。

### 2. 执行单个场景

1. 读取 `tests/smoke/scenarios/<name>.md`，解析 YAML frontmatter
2. 如文件不存在，回复："场景 '<name>' 不存在。可用场景：<列出所有场景名>"
3. 启动 Playwright：
   - 使用 `import { chromium } from '@playwright/test'`
   - `const browser = await chromium.launch({ headless: !headed })`
   - 如启动失败，提示用户运行 `npx playwright install chromium`
4. 设置错误收集：console error、network 4xx/5xx、antd error（`.ant-message-error`、`.ant-notification-error`）
5. 按 steps 顺序执行：
   - `goto`: `await page.goto(baseUrl + step.path, { timeout: 30000, waitUntil: 'load' })`
   - `fill`: `await page.waitForSelector(step.selector); await page.fill(step.selector, step.value)`
   - `click`: `await page.waitForSelector(step.selector); await page.click(step.selector); await page.waitForTimeout(500)`
   - `wait`: 如指定 selector，等待其可见（timeout 取 step.timeout）；否则 `await page.waitForTimeout(step.timeout)`
   - `check`: 检查 url（`page.url().includes(step.url)`）、contains（`page.innerText` 包含）、noError（收集的 errors 为空）
   - `logout`: 导航到 `/logout` 或点击登出按钮，等待跳转到登录页
   - `relogin`: `goto /login` → `fill` 用户名 → `fill` 密码 → `click` 登录 → `wait` 跳转
6. 每步记录 ✅/❌
7. 每步后额外等待 `--wait` 毫秒（默认 500）
8. 执行完毕后检查 `expect` 做综合判定
9. 关闭浏览器

### 3. 执行全部场景（`all`）

依次读取 `tests/smoke/scenarios/` 下所有 `.md` 文件，对每个执行上述流程。每个场景独立报告。最后输出汇总：N 个场景，M 个通过，K 个失败。

### 4. 报告生成

每个场景执行完毕后，生成 `tests/smoke/reports/<name>-<timestamp>.md`（ISO timestamp 格式，如 `2026-06-13T14-30-00`）。`tests/smoke/reports/` 目录如不存在则自动创建。

报告结构：

```markdown
# 冒烟场景报告: <name>

- **时间**: <ISO timestamp>
- **URL**: <base URL>
- **角色**: <role 或 无>

## 执行步骤

| 序号 | 步骤 | 结果 |
|------|------|------|
| 1 | ✅ goto /login — 200 | |
| 2 | ✅ fill input[placeholder*="用户名"] = admin | |
| ... | ... | |

## 综合判定

🟢 通过 — N/N 步骤成功，<简述>
```

全部通过时简洁呈现。有失败时详细展开：实际值 vs 期望值、错误消息。

### 5. 错误收集

复用 browser-smoke 的 Playwright 错误收集模式：
- `page.on('console', msg => { if (msg.type() === 'error') errors.console.push(msg.text()) })`
- `page.on('pageerror', err => errors.console.push(err.message))`
- `page.on('response', res => { if (res.status() >= 400) errors.network.push({url, status}) })`
- antd 错误：`document.querySelectorAll('.ant-message-error, .ant-notification-error')`

## 依赖

- `@playwright/test`（已安装）
- Playwright Chromium browser（`npx playwright install chromium`）

## 与 browser-smoke 的关系

browser-smoke 做通用存活检测（半随机点击，不登录），smoke-scenario 做精确场景测试（按步骤操作，角色登录，验证结果）。两者共享 Playwright 错误收集模式，但互不调用。
