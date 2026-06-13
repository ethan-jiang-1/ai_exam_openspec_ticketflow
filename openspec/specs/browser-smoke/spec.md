# browser-smoke Specification

## Purpose

`/browser-smoke` skill 的行为规范——Claude Code 浏览器冒烟测试入口，支持 on/off 开关，调用底层 Playwright 脚本对部署 URL 执行存活检测，产出 JSON（机器）和 Markdown（人读）双份报告，落盘到 `data/smoke-reports/`。

脚本 `.claude/skills/browser-smoke/scripts/browser-smoke.mjs` 是 skill 的底层引擎，规范其 CLI 接口、四阶段探测流程、错误收集和报告格式。

## Requirements

### Requirement: BS-001 浏览器冒烟测试脚本

项目 SHALL 包含 `.claude/skills/browser-smoke/scripts/browser-smoke.mjs`，一个独立的 Node.js 脚本，使用 Playwright 直接调 chromium API（不使用 `@playwright/test` 的 test runner），对目标 URL 执行四个阶段的冒烟检测：LOAD（加载测速）→ SCAN（DOM 内容摘要）→ EXPLORE（半随机交互）→ REPORT（结构化输出 + 文件落盘）。

#### Scenario: 脚本接收 URL 参数

- **WHEN** 执行 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url https://example.com`
- **THEN** 脚本 SHALL 使用 Playwright 启动 Chromium（默认 headless，可通过 `--headed` 打开可见窗口），导航到该 URL，执行全部四个阶段，输出 JSON 报告到 stdout 并写入文件

#### Scenario: 默认 click 数量

- **WHEN** 执行脚本且未指定 `--clicks` 参数
- **THEN** EXPLORE 阶段 SHALL 默认点击最多 8 个可交互元素

#### Scenario: 自定义 click 数量

- **WHEN** 执行 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url> --clicks 3`
- **THEN** EXPLORE 阶段 SHALL 点击最多 3 个可交互元素

#### Scenario: 只读模式

- **WHEN** 执行 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url> --readonly`
- **THEN** EXPLORE 阶段 SHALL 排除可能产生写操作的元素（button[type="submit"]、带有"删除""确认"等文本的按钮），仅点击链接、菜单项等安全元素

#### Scenario: headed 模式

- **WHEN** 执行 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url> --headed`
- **THEN** 脚本 SHALL 启动可见 Chromium 窗口（非 headless），方便人工观察浏览器行为
- **AND** 未传 `--headed` 时 SHALL 默认使用 headless 模式

#### Scenario: Playwright 未安装时的友好报错

- **WHEN** `chromium.launch()` 抛出错误（Chromium 未安装）
- **THEN** 脚本 SHALL 输出包含 `npx playwright install chromium` 指引的错误信息，并以 exit code 2 退出

#### Scenario: 目标 URL 不可达

- **WHEN** 目标 URL 返回连接错误或 HTTP 5xx
- **THEN** 脚本 SHALL 在 JSON 报告的 `errors.network` 中记录该错误，verdict 为 `"unhealthy"`，以 exit code 1 退出

### Requirement: BS-002 页面加载测速

LOAD 阶段 SHALL 通过 Performance API 收集页面加载时间指标，并判定加载速度等级。

#### Scenario: 收集加载时间指标

- **WHEN** 浏览器导航到目标 URL 且 `domContentLoaded` 事件触发
- **THEN** SHALL 收集以下指标（单位毫秒）：
  - `firstByte`: `responseStart - requestStart`
  - `domReady`: `domContentLoadedEventEnd - navigationStart`
  - `fullLoad`: `loadEventEnd - navigationStart`

#### Scenario: 加载速度判定

- **WHEN** 指标收集完毕
- **THEN** SHALL 按以下规则判定 `timing.verdict`：
  - `firstByte < 1000 && fullLoad < 3000` → `"fast"`
  - `firstByte < 3000 && fullLoad < 8000` → `"normal"`
  - 其他情况 → `"slow"`

#### Scenario: Performance API 不可用时的降级

- **WHEN** 页面不提供 Navigation Timing API（如非 Web 页面）
- **THEN** SHALL 将 `timing.verdict` 设为 `"unavailable"`，不标记为异常

### Requirement: BS-003 DOM 内容摘要

SCAN 阶段 SHALL 提取页面 DOM 的关键内容摘要，包括页面标题、可见文本片段、可交互元素分类计数、可疑错误关键词检测。

#### Scenario: 提取页面标题

- **WHEN** 页面加载完成
- **THEN** `pageContent.title` SHALL 为 `document.title` 的值

#### Scenario: 提取可见文本片段

- **WHEN** 页面加载完成
- **THEN** `pageContent.visibleTextSample` SHALL 为页面前 20 个非空可见文本节点的内容（每个截取前 100 字符）

#### Scenario: 统计可交互元素

- **WHEN** 页面加载完成
- **THEN** `pageContent.interactiveCount` SHALL 为可见且非 disabled 的可交互元素总数
- **AND** `pageContent.interactiveBreakdown` SHALL 包含以下分类的计数：`buttons`、`links`、`inputs`、`selects`、`menuItems`

#### Scenario: 检测页面级错误关键词

- **WHEN** 页面可见文本中包含 "Error"、"404"、"500"、"崩溃"、"not found"、"Internal Server Error" 等关键词（大小写不敏感）
- **THEN** `pageContent.hasErrorKeywords` SHALL 为 `true`

### Requirement: BS-004 半随机交互探测

EXPLORE 阶段 SHALL 按优先级从页面中选择可交互元素并依次点击，每次点击后等待短暂时间，观察页面变化。点击策略 SHALL 为半随机：在优先级分组内随机选择，优先选择高优先级元素。

#### Scenario: 元素优先级

- **WHEN** EXPLORE 阶段开始
- **THEN** 可交互元素 SHALL 按以下优先级排序选择：
  1. `button`（非 disabled、非 hidden）
  2. `a`（有 href、非空）
  3. `.ant-select-selector`
  4. `input[type="text"]`、`input[type="search"]`
  5. `.ant-tag`、`.ant-menu-item`
- **AND** 同一优先级组内随机打乱顺序

#### Scenario: 排除不可交互元素

- **WHEN** 收集可交互元素列表
- **THEN** SHALL 排除以下元素：
  - `[disabled]` 或 `[aria-disabled="true"]`
  - `display: none` 或 `visibility: hidden`
  - 不在视口内（`getBoundingClientRect()` 超出 viewport）
  - 宽或高为 0

#### Scenario: 点击后等待与观察

- **WHEN** 对一个元素执行 `element.click()`
- **THEN** SHALL 等待 500ms，然后检查：
  - 页面 URL 是否变化（`page.url()` 前后对比）
  - DOM 元素总数是否变化（变化 > 10% 判定为 `"contentChanged"`）
  - `result` 取值 SHALL 为 `"navigated"` | `"contentChanged"` | `"noChange"`

#### Scenario: 点击失败时记录

- **WHEN** `element.click()` 抛出异常（元素被遮挡、不可点击等）
- **THEN** SHALL 记录 `result` 为 `"clickFailed"`，`error` 字段包含异常消息，继续处理下一个元素

### Requirement: BS-005 异常检测

脚本 SHALL 在整个执行过程中持续收集三种异常：浏览器 console error、network 请求 4xx/5xx 错误、antd 错误消息提示。

#### Scenario: Console error 收集

- **WHEN** 浏览过程中页面触发 `console.error()` 或未捕获的 JS 异常
- **THEN** 每条错误 SHALL 记录 `{ type: "console", message: <文本>, timestamp: <ISO> }` 到 `errors.console` 数组

#### Scenario: Network 错误收集

- **WHEN** 浏览过程中任意 HTTP 请求返回 4xx 或 5xx 状态码
- **THEN** 每个错误请求 SHALL 记录 `{ type: "network", url: <请求URL>, status: <状态码>, method: <方法> }` 到 `errors.network` 数组

#### Scenario: antd 错误消息检测

- **WHEN** 页面 DOM 中出现 `.ant-message-error` 或 `.ant-notification-error` 元素
- **THEN** SHALL 提取其文本内容，记录 `{ type: "antd", message: <文本> }` 到 `errors.antdErrorMessages` 数组

#### Scenario: 页面白屏检测

- **WHEN** 任意阶段发现 `document.body.innerText.trim() === ''` 且页面不是空白页（about:blank）
- **THEN** SHALL 记录 `{ type: "whiteScreen" }` 到 `errors.console` 数组，verdict SHALL 为 `"unhealthy"`

### Requirement: BS-006 结构化报告与退出码

脚本 SHALL 将全部探测结果以 JSON 格式输出到 stdout，并同时写入 `data/smoke-reports/` 目录下的文件，按探测结果设置退出码。

#### Scenario: 报告 JSON 结构

- **WHEN** 四个阶段全部完成
- **THEN** stdout 输出的 JSON SHALL 包含以下顶层字段：`url`、`timestamp`、`timing`、`pageContent`、`errors`、`explorations`、`verdict`

#### Scenario: JSON 报告落盘

- **WHEN** 脚本执行且 `--output-dir` 未指定
- **THEN** SHALL 将 JSON 报告写入 `data/smoke-reports/<ISO-timestamp>.json`
- **AND** 目录 `data/smoke-reports/` 如不存在 SHALL 自动创建

#### Scenario: 自定义输出目录

- **WHEN** 执行 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url> --output-dir /tmp/smoke`
- **THEN** SHALL 将报告写入指定目录

#### Scenario: 健康判定规则

- **WHEN** 生成最终 `verdict`
- **THEN** SHALL 按以下规则判定：
  - `errors.console` 为空、`errors.network` 为空、`errors.antdErrorMessages` 为空 → `"healthy"`
  - 仅有 `timing.verdict === "slow"`，无其他错误 → `"warning"`
  - 存在任何 console error、network error、antd error 或 whiteScreen → `"unhealthy"`

#### Scenario: 退出码

- **WHEN** 脚本完成
- **THEN** exit code SHALL 为：
  - `0`：verdict 为 `"healthy"` 或 `"warning"`
  - `1`：verdict 为 `"unhealthy"`
  - `2`：脚本自身错误（Chromium 未安装、参数错误等）

#### Scenario: 美化输出选项

- **WHEN** 执行脚本时带有 `--pretty` 参数
- **THEN** stdout 输出的 JSON SHALL 格式化缩进（`JSON.stringify(data, null, 2)`）

### Requirement: BS-007 Claude Code Skill 作为主入口

项目 SHALL 包含 `.claude/skills/browser-smoke/SKILL.md`，作为冒烟测试的用户主入口。Skill 负责接收用户指令、管理 on/off 状态、调用底层脚本、解读报告并用中文向用户汇报。

#### Scenario: Skill 调用脚本执行冒烟

- **WHEN** 用户在 Claude Code 中输入 `/browser-smoke https://example.com`
- **THEN** Claude SHALL 检查 `.browser-smoke-state.json` 状态
- **AND** 若启用（enabled: true），SHALL 执行 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url https://example.com`
- **AND** 读 JSON 输出，用中文向用户汇报
- **AND** 告知用户报告文件路径（JSON + Markdown）

#### Scenario: Skill 在关闭状态下拒绝执行

- **WHEN** 用户在 Claude Code 中输入 `/browser-smoke <url>`
- **AND** `.browser-smoke-state.json` 中 `enabled` 为 `false`
- **THEN** Claude SHALL 回复："冒烟测试已关闭，输入 `/browser-smoke on` 开启"
- **AND** SHALL NOT 执行冒烟测试脚本

#### Scenario: Skill 开启冒烟测试

- **WHEN** 用户输入 `/browser-smoke on`
- **THEN** Claude SHALL 读取 `.browser-smoke-state.json`，仅将 `enabled` 改为 `true`，保留 `defaultUrl` 不变，写回文件
- **AND** SHALL 回复："冒烟测试已开启 ✅"

#### Scenario: Skill 关闭冒烟测试

- **WHEN** 用户输入 `/browser-smoke off`
- **THEN** Claude SHALL 读取 `.browser-smoke-state.json`，仅将 `enabled` 改为 `false`，保留 `defaultUrl` 不变，写回文件
- **AND** SHALL 回复："冒烟测试已关闭，需要时输入 `/browser-smoke on` 重新开启"

#### Scenario: Skill 使用默认 URL

- **WHEN** 用户输入 `/browser-smoke`（不带 URL）
- **AND** `.browser-smoke-state.json` 中 `enabled` 为 `true`
- **THEN** Claude SHALL 读取 `defaultUrl` 字段
- **AND** SHALL 执行 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <defaultUrl>`
- **AND** 用中文向用户汇报结果

#### Scenario: Skill 覆盖默认 URL

- **WHEN** 用户输入 `/browser-smoke https://staging.example.com`
- **THEN** SHALL 使用用户指定的 URL 执行冒烟（忽略 defaultUrl）

#### Scenario: Skill 修改默认 URL

- **WHEN** 用户输入 `/browser-smoke default-url https://new-deploy.workers.dev`
- **THEN** Claude SHALL 更新 `.browser-smoke-state.json` 中的 `defaultUrl` 字段（保留 `enabled` 不变）
- **AND** SHALL 回复："默认测试 URL 已更新为 https://new-deploy.workers.dev"

#### Scenario: Skill 查看状态

- **WHEN** 用户输入 `/browser-smoke status`
- **THEN** Claude SHALL 读取 `.browser-smoke-state.json`，回复当前状态和默认 URL：
  - "冒烟测试当前状态：已开启 ✅，默认 URL：https://..." 或
  - "冒烟测试当前状态：已关闭 ❌，默认 URL：https://..."

#### Scenario: Skill 解读报告

- **WHEN** 脚本输出 JSON 报告后
- **THEN** Claude SHALL 向用户呈现：
  - 加载速度总结（快/正常/慢，具体毫秒数）
  - 页面内容摘要（标题、可交互元素数量、是否有错误关键词）
  - 交互探测结果（点了几个、几个有反应、几个报错）
  - 综合判定（🟢 健康 / 🟡 警告 / 🔴 异常）
  - 如有异常，列出每条 error 详情
  - 报告文件路径

#### Scenario: Skill 参数透传

- **WHEN** 用户输入 `/browser-smoke <url> --clicks 3 --readonly`
- **THEN** Claude SHALL 将额外参数原样传递给脚本

### Requirement: BS-008 人可读报告

脚本 SHALL 在生成 JSON 报告的同时，产出人可读的中文 Markdown 报告，写入与 JSON 同目录、同时间戳的 `.md` 文件。

#### Scenario: Markdown 报告生成

- **WHEN** 脚本完成所有探测
- **THEN** SHALL 生成 `data/smoke-reports/<ISO-timestamp>.md`，内容为中文叙述，包含：
  - 标题：`# 浏览器冒烟测试报告`
  - 基本信息：测试 URL、时间戳
  - 加载速度：详细指标（firstByte/domReady/fullLoad）和等级判定
  - 页面内容：标题、可交互元素数量、文本片段摘要
  - 交互探测：点击详情表格（元素、动作、结果、是否有异常）
  - 异常列表：如有 console error、network error、antd error，逐一列出
  - 综合判定：🟢/🟡/🔴 及 verdict 说明

#### Scenario: Markdown 报告在无异常时简洁呈现

- **WHEN** 所有探测无异常
- **THEN** Markdown 报告 SHALL 以简洁为主，不列出空错误表，突出"正常运行"

#### Scenario: Markdown 报告在有异常时详细展开

- **WHEN** 探测发现异常
- **THEN** Markdown 报告 SHALL 将异常详情展开，包含具体的错误消息、URL、状态码
