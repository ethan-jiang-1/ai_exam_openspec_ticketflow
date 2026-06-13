## 1. Skill（主交付物）

- [x] 1.1 确认 Playwright chromium 可用：检查 `@playwright/test` 是否已安装 chromium 浏览器，如未安装则运行 `npx playwright install chromium` [BA-006]

- [x] 1.2 创建 `.claude/skills/browser-smoke/SKILL.md`：编写 skill frontmatter（name: browser-smoke, description: 浏览器冒烟测试）和指令内容，覆盖以下行为 [BS-007]：
  - 接收 `/browser-smoke on|off|status|<url>` 指令
  - 管理 `.browser-smoke-state.json` 状态文件（读/写）
  - 调用 `node .claude/skills/browser-smoke/scripts/browser-smoke.mjs --url <url> ...` 执行测试
  - 读 JSON 报告，翻译为中文四维度总结（速度/内容/交互/判定）
  - 告知用户报告文件路径
  - 透传额外参数（`--clicks`、`--readonly`、`--output-dir`）

- [x] 1.3 Skill 状态管理逻辑 [BS-007]：
  - `/browser-smoke on` → 保持 defaultUrl 不变，仅改 `enabled` 为 true，回复"已开启"
  - `/browser-smoke off` → 保持 defaultUrl 不变，仅改 `enabled` 为 false，回复"已关闭"
  - `/browser-smoke status` → 显示 enabled 状态 + 当前默认 URL
  - `/browser-smoke`（无参数）→ 启用时使用 `defaultUrl` 执行，关闭时提示
  - `/browser-smoke <url>`（有 URL）→ 覆盖 defaultUrl，直接执行
  - `/browser-smoke default-url <url>` → 更新 `defaultUrl`，保留 enabled 不变
  - 首次使用时自动创建 `{"enabled": true, "defaultUrl": "https://ai-exam-openspec-ticketflow.ethan1-jiang.workers.dev"}`

## 2. 底层脚本（skill 引擎）

依赖：1.2 完成（skill 定义好脚本调用接口）

- [x] 2.1 创建 `.claude/skills/browser-smoke/scripts/browser-smoke.mjs` 骨架：解析 CLI 参数（`--url`、`--clicks`、`--readonly`、`--pretty`、`--output-dir`），启动 headless Chromium，建立四阶段执行框架（LOAD → SCAN → EXPLORE → REPORT），注册 console/network/pageerror 监听器 [BS-001]

- [x] 2.2 实现 LOAD 阶段：导航到目标 URL，通过 `page.evaluate()` 读取 Navigation Timing API，判定速度等级（fast/normal/slow/unavailable），填充 `timing` 字段 [BS-002]

- [x] 2.3 实现 SCAN 阶段：提取 `document.title`，获取前 20 个可见文本节点，按类型统计可交互元素，检测错误关键词，填充 `pageContent` 字段 [BS-003]

- [x] 2.4 实现 EXPLORE 阶段：按优先级收集可交互元素，排除不可交互元素，半随机选择最多 N 个点击，每次等待 500ms 观察 URL/DOM 变化，记录结果 [BS-004]

- [x] 2.5 实现错误收集：持续监听 console error、network 4xx/5xx、antd error message、白屏检测，填充 `errors` 字段 [BS-005]

- [x] 2.6 实现 REPORT 阶段 [BS-006]：
  - 整合数据，按规则判定 verdict（healthy/warning/unhealthy）
  - 输出 JSON 到 stdout（`--pretty` 时格式化）
  - 自动创建 `data/smoke-reports/` 目录（如不存在）
  - 写入 `<timestamp>.json` 文件
  - 设置 exit code（0/1/2），关闭浏览器

- [x] 2.7 实现 Markdown 人可读报告生成 [BS-008]：
  - 基于同一份数据生成 `data/smoke-reports/<timestamp>.md`
  - 中文叙述格式：基本信息 → 加载速度 → 页面内容 → 交互详情 → 异常列表 → 综合判定
  - 无异常时简洁，有异常时详细展开

## 3. 基础设施

依赖：2.6 完成

- [x] 3.1 在 `package.json` 的 `scripts` 中新增 `"smoke": "node .claude/skills/browser-smoke/scripts/browser-smoke.mjs"` [BA-007]

- [x] 3.2 更新 `.gitignore`：添加 `.browser-smoke-state.json` 和 `data/smoke-reports/`

## 4. 文档

依赖：全部完成

- [x] 4.1 更新 `scripts/README.md`：在表格中新增 `browser-smoke.mjs` 一行，说明用途（浏览器冒烟测试）、调用方式（`pnpm smoke -- --url <url>` 和 `/browser-smoke` skill）、与 e2e-smoke 的区别 [BA-006]

## 5. 验证

依赖：全部完成

- [x] 5.1 验证 on/off 开关：`/browser-smoke on` → 确认 state 文件中 `enabled` 为 `true`；`/browser-smoke off` → 确认 `enabled` 变为 `false`，`defaultUrl` 不变 [BS-007]

- [x] 5.2 验证关闭态拒绝：off 状态下 `/browser-smoke` 应回复"冒烟测试已关闭"而不执行脚本 [BS-007]

- [x] 5.3 验证默认 URL：`/browser-smoke`（无参数）应使用 `defaultUrl`（Cloudflare 部署地址）执行冒烟 [BS-007]

- [x] 5.4 验证覆盖 URL：`/browser-smoke http://localhost:5173` 应使用手动指定的 URL [BS-007]

- [x] 5.5 验证修改默认 URL：`/browser-smoke default-url https://other.example.com` → 确认 state 文件中 `defaultUrl` 更新 [BS-007]

- [x] 5.6 对本地环境运行一次完整冒烟，验证 Claude 正确调用脚本并给出中文四维度报告 [BS-007]

- [x] 5.7 验证 `data/smoke-reports/` 下生成 `<timestamp>.json` 和 `<timestamp>.md` 两份文件 [BS-006, BS-008]

- [x] 5.8 验证 Markdown 报告内容：打开 `.md` 文件，确认中文叙述可读、包含所有必要章节、无异常时简洁 [BS-008]

- [x] 5.9 验证 `pnpm smoke -- --url http://localhost:5173` 可脱离 skill 独立运行，stdout 输出 JSON [BS-006]

- [x] 5.10 验证 `--clicks 3` 和 `--readonly` 参数生效

- [x] 5.11 验证 exit code：健康 → 0，异常 → 1
