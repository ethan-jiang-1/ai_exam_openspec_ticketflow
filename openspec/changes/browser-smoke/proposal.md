## Why

部署后的验证目前依赖人工打开浏览器检查，或运行 `e2e-smoke.mjs`（纯 API 层，不验证前端渲染）。缺少一个能自动用真实浏览器打开部署 URL、看页面内容、随便点击、判断是否正常的粗粒度 smoke 检测。每次部署到 Cloudflare 后，想知道"这个部署还活着吗"需要手动操作，浪费时间且容易漏。

## What Changes

- 新增 `/browser-smoke` skill（`.claude/skills/browser-smoke/SKILL.md`）：浏览器冒烟测试的 Claude Code 入口。支持 on/off 开关——`/browser-smoke on` 启用、`/browser-smoke off` 关闭，状态持久化到 `.browser-smoke-state.json`。调用时自动运行底层 Playwright 脚本，读 JSON 报告，用中文向用户汇报加载速度、页面内容、交互探测结果和综合判定
- 新增 `.claude/skills/browser-smoke/scripts/browser-smoke.mjs`：skill 底层调用的 Playwright 脚本（不依赖 test runner），打开目标 URL，测加载速度，读 DOM 内容，半随机点击可交互元素，观察 console/network/antd 报错，输出结构化 JSON 报告到 stdout 并落盘 `data/smoke-reports/<timestamp>.json`
- 在 `package.json` 中新增 `smoke` script，方便脱离 skill 直接调用脚本
- 在 `scripts/README.md` 中补充 browser-smoke 的说明

## Capabilities

### New Capabilities
- `browser-smoke`: Claude Code 浏览器冒烟测试 skill——Playwright 驱动的部署存活检测，支持 on/off 开关，测速 + DOM 内容摘要 + 半随机交互 + 异常捕获，报告落盘 `data/smoke-reports/`

### Modified Capabilities
- `browser-automation`: 新增 smoke test 模式，与 E2E 测试模式、诊断模式并列，作为 Playwright 的第三种使用形态。需要新增 BA-006（smoke 测试基础设施）和 BA-007（smoke 报告格式）两个 requirement

## Impact

| 类型 | 文件/目录 |
|------|----------|
| 新增 | `.claude/skills/browser-smoke/SKILL.md`（主交付物） |
| 新增 | `.claude/skills/browser-smoke/scripts/browser-smoke.mjs`（skill 底层脚本） |
| 新增 | `data/smoke-reports/`（报告落盘目录） |
| 新增 | `.browser-smoke-state.json`（on/off 状态，gitignored） |
| 修改 | `.gitignore`（新增 state 文件和 reports 目录） |
| 修改 | `package.json`（新增 `smoke` script） |
| 修改 | `scripts/README.md` |
| 修改 | `openspec/specs/browser-automation/spec.md`（新增 BA-006, BA-007） |
| 新增 | `openspec/specs/browser-smoke/spec.md` |

## Success Criteria

- [ ] `/browser-smoke on` 启用测试，`/browser-smoke off` 关闭，状态持久化
- [ ] `/browser-smoke <url>` 在启用状态下运行完整冒烟测试，Claude 输出中文报告
- [ ] `/browser-smoke <url>` 在关闭状态下提示用户"冒烟测试已关闭，输入 `/browser-smoke on` 开启"
- [ ] 报告落盘 `data/smoke-reports/<timestamp>.json`，可回查历史
- [ ] `pnpm smoke -- --url <url>` 可脱离 skill 独立运行脚本
- [ ] 脚本可检测：加载速度、页面内容摘要、console error、network error、antd error message
- [ ] 退出码：0 = 健康，1 = 检测到异常，2 = 脚本自身错误
