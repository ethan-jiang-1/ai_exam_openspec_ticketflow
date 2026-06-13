# browser-smoke Specification

## Purpose
浏览器冒烟测试能力规范——Playwright 驱动的部署存活检测工具，测加载速度、读 DOM 内容、半随机点击交互元素、捕获异常，输出结构化 JSON 报告。通过 Claude Code skill 调用并解读报告。

## ADDED Requirements

### Requirement: BS-001 浏览器冒烟测试脚本

项目 SHALL 包含 `scripts/browser-smoke.mjs`，一个独立的 Node.js 脚本，使用 Playwright 直接调 chromium API（不使用 `@playwright/test` 的 test runner），对目标 URL 执行四个阶段的冒烟检测：LOAD（加载测速）→ SCAN（DOM 内容摘要）→ EXPLORE（半随机交互）→ REPORT（结构化输出）。

#### Scenario: 脚本接收 URL 参数

- **WHEN** 执行 `node scripts/browser-smoke.mjs --url https://example.com`
- **THEN** 脚本 SHALL 使用 Playwright 启动 headless Chromium，导航到该 URL，执行全部四个阶段，输出 JSON 报告到 stdout

#### Scenario: 默认 click 数量

- **WHEN** 执行脚本且未指定 `--clicks` 参数
- **THEN** EXPLORE 阶段 SHALL 默认点击最多 8 个可交互元素

#### Scenario: 自定义 click 数量

- **WHEN** 执行 `node scripts/browser-smoke.mjs --url <url> --clicks 3`
- **THEN** EXPLORE 阶段 SHALL 点击最多 3 个可交互元素

#### Scenario: 只读模式

- **WHEN** 执行 `node scripts/browser-smoke.mjs --url <url> --readonly`
- **THEN** EXPLORE 阶段 SHALL 排除可能产生写操作的元素（button[type="submit"]、带有"删除""确认"等文本的按钮），仅点击链接、菜单项等安全元素

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

脚本 SHALL 将全部探测结果以 JSON 格式输出到 stdout，并按探测结果设置退出码。

#### Scenario: 报告 JSON 结构

- **WHEN** 四个阶段全部完成
- **THEN** stdout 输出的 JSON SHALL 包含以下顶层字段：`url`、`timestamp`、`timing`、`pageContent`、`errors`、`explorations`、`verdict`

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

### Requirement: BS-007 Claude Code Skill 集成

项目 SHALL 包含 `.claude/skills/browser-smoke/SKILL.md`，使 Claude Code 可调用冒烟测试脚本并解读报告。

#### Scenario: Skill 调用脚本

- **WHEN** 用户在 Claude Code 中输入 `/browser-smoke https://example.com`
- **THEN** Claude SHALL 执行 `node scripts/browser-smoke.mjs --url https://example.com`，读 JSON 输出，用中文向用户汇报

#### Scenario: Skill 解读报告

- **WHEN** 脚本输出 JSON 报告后
- **THEN** Claude SHALL 向用户呈现：
  - 加载速度总结（快/正常/慢，具体毫秒数）
  - 页面内容摘要（标题、可交互元素数量、是否有错误关键词）
  - 交互探测结果（点了几个、几个有反应、几个报错）
  - 综合判定（🟢 健康 / 🟡 警告 / 🔴 异常）
  - 如有异常，列出每条 error 详情

#### Scenario: Skill 参数透传

- **WHEN** 用户输入 `/browser-smoke <url> --clicks 3 --readonly`
- **THEN** Claude SHALL 将额外参数原样传递给脚本
