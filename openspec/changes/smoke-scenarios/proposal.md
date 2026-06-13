## Why

`browser-smoke` skill 解决了"部署还活着吗"这个通用问题，但它半随机点击，不登录、不走业务流程。我们需要第二层：**精确的冒烟场景**——登录指定角色、按步骤操作、验证期望结果。这两个互补：一个测存活，一个测功能。

## What Changes

- 新增 `tests/smoke/` 目录，存放冒烟场景 MD 文件（coding agent 可读可执行）
- 新增 skill `/smoke-scenario`，读场景文件 → 用 Playwright 逐步执行 → 产出场景级报告
- 场景格式标准化：角色登录、步骤序列、每步的期望结果
- 报告落到 `tests/smoke/<name>-<timestamp>.md`，和场景定义放一起
- 复用 browser-smoke 的 Playwright 使用模式（裸调 API，不走 test runner），不改 browser-smoke skill

## Capabilities

### New Capabilities
- `smoke-scenarios`: 基于浏览器自动化的冒烟场景定义与执行——标准化的场景 MD 文件，coding agent 读取后按步骤精确执行 Playwright 操作（登录、填写、点击、验证），产出场景级中文报告

### Modified Capabilities
无。browser-smoke 不变。

## Impact

| 文件/目录 | 影响 |
|-----------|------|
| `tests/smoke/` | 新增目录，存放场景 MD 文件 |
| `.claude/skills/smoke-scenario/SKILL.md` | 新增 skill 入口 |
| `data/smoke-reports/` | 不变，browser-smoke 继续用 |
