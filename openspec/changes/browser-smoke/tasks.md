## 1. 基础设施

- [ ] 1.1 确认 Playwright 可用性：检查 `@playwright/test` 是否已安装 chromium 浏览器，如未安装则运行 `npx playwright install chromium` [BA-006]

- [ ] 1.2 在 `package.json` 的 `scripts` 中新增 `"smoke": "node scripts/browser-smoke.mjs"` [BA-007]

## 2. browser-smoke.mjs 脚本

依赖：1.1 完成

- [ ] 2.1 创建 `scripts/browser-smoke.mjs` 骨架：解析 CLI 参数（`--url`、`--clicks`、`--readonly`、`--pretty`），启动 headless Chromium，建立四阶段执行框架（LOAD → SCAN → EXPLORE → REPORT），注册 console/network/pageerror 监听器 [BS-001]

- [ ] 2.2 实现 LOAD 阶段：导航到目标 URL，通过 `page.evaluate()` 读取 Navigation Timing API（`responseStart - requestStart`、`domContentLoadedEventEnd`、`loadEventEnd`），判定速度等级（fast/normal/slow/unavailable），填充 `timing` 字段 [BS-002]

- [ ] 2.3 实现 SCAN 阶段：提取 `document.title`，获取前 20 个可见文本节点内容，按 `button/a/input/select/.ant-select-selector/.ant-menu-item/.ant-tag` 分类统计可交互元素数量，检测页面是否包含错误关键词（Error/404/500/崩溃/not found），填充 `pageContent` 字段 [BS-003]

- [ ] 2.4 实现 EXPLORE 阶段：按优先级（button > a > .ant-select-selector > input > .ant-tag > .ant-menu-item）收集可交互元素，排除 disabled/hidden/视口外/零尺寸元素，半随机选择最多 N 个元素依次点击，每次点击后等待 500ms 检查 URL 变化和 DOM 变化（元素总数变化 >10%），记录每次点击的 selector/tagName/visibleText/result/errors [BS-004]

- [ ] 2.5 实现错误收集：在脚本运行期间持续收集三种错误：(a) console error 和未捕获异常，(b) network 4xx/5xx 响应，(c) DOM 中 `.ant-message-error` 和 `.ant-notification-error` 元素。额外检测白屏（`body.innerText.trim() === ''`），填充 `errors` 字段 [BS-005]

- [ ] 2.6 实现 REPORT 阶段：整合四个阶段数据，按规则判定 `verdict`（healthy/warning/unhealthy），输出 JSON 到 stdout（`--pretty` 时格式化），按规则设置 exit code（0/1/2），关闭浏览器 [BS-006]

## 3. Claude Code Skill

依赖：2.6 完成（脚本可独立运行）

- [ ] 3.1 创建 `.claude/skills/browser-smoke/SKILL.md`：编写 skill 的 frontmatter（name/description/metadata）和指令内容，告诉 Claude 如何调用脚本、如何解读 JSON 报告的每个字段、如何用中文向用户呈现加载速度/页面内容/交互结果/综合判定的四个维度总结 [BS-007]

## 4. 文档

依赖：2.6 完成

- [ ] 4.1 更新 `scripts/README.md`：在表格中新增 `browser-smoke.mjs` 一行，说明其用途（浏览器冒烟测试）、调用方式（`pnpm smoke -- --url <url>`）、与 e2e-smoke 的区别（浏览器 vs API 层） [BA-006]

## 5. 验证

依赖：全部 task 完成

- [ ] 5.1 对本地开发环境运行 `pnpm smoke -- --url http://localhost:5173`，验证脚本能正常打开登录页、提取内容、点击元素、输出 JSON、退出码为 0 [BS-001, BS-006]

- [ ] 5.2 验证 `--pretty` 参数输出格式化 JSON

- [ ] 5.3 验证 `--clicks 3` 参数限制点击数量

- [ ] 5.4 验证 `--readonly` 参数排除提交类按钮

- [ ] 5.5 验证 `/browser-smoke` skill：在 Claude Code 中输入 `/browser-smoke http://localhost:5173`，确认 Claude 正确调用脚本并给出中文报告 [BS-007]
