## Why

部署后的验证目前依赖人工打开浏览器检查，或运行 `e2e-smoke.mjs`（纯 API 层，不验证前端渲染）。缺少一个能自动用真实浏览器打开部署 URL、看页面内容、随便点击、判断是否正常的粗粒度 smoke 检测。每次部署到 Cloudflare 后，想知道"这个部署还活着吗"需要手动操作，浪费时间且容易漏。

## What Changes

- 新增 `scripts/browser-smoke.mjs`：独立的 Node.js 脚本，用 Playwright 直接调 API（不依赖 test runner），打开目标 URL，测加载速度，读 DOM 内容，半随机点击可交互元素，观察 console/network/antd 报错，输出结构化 JSON 报告
- 新增 `.claude/skills/browser-smoke/SKILL.md`：Claude Code skill，调用上述脚本并解读报告给人看
- 在 `package.json` 中新增 `smoke` script，方便直接调用等一下，有两个东西要确定啊，第一/
- 在 `scripts/README.md` 中补充 browser-smoke 的说明

## Capabilities

### New Capabilities
- `browser-smoke`: 浏览器冒烟测试——Playwright 驱动的部署存活检测，测速 + DOM 内容摘要 + 半随机交互 + 异常捕获，输出结构化报告

### Modified Capabilities
- `browser-automation`: 新增 smoke test 模式，与 E2E 测试模式、诊断模式并列，作为 Playwright 的第三种使用形态。需要新增 BA-006（smoke 测试基础设施）和 BA-007（smoke 报告格式）两个 requirement

## Impact

| 类型 | 文件/目录 |
|------|----------|
| 新增 | `scripts/browser-smoke.mjs` |
| 新增 | `.claude/skills/browser-smoke/SKILL.md` |
| 修改 | `package.json`（新增 `smoke` script） |
| 修改 | `scripts/README.md` |
| 修改 | `openspec/specs/browser-automation/spec.md`（新增 BA-006, BA-007） |
| 新增 | `openspec/specs/browser-smoke/spec.md` |

## Success Criteria

- [ ] `pnpm smoke <url>` 可对任意 URL 运行完整冒烟测试，输出 JSON 报告
- [ ] `/browser-smoke <url>` skill 可调用脚本并给出人类可读的总结
- [ ] 脚本可检测：加载速度、页面内容摘要、console error、network error、antd error message
- [ ] 交互探测：半随机选择可交互元素点击，判断是否有异常反应
- [ ] 退出码：0 = 健康，1 = 检测到异常
