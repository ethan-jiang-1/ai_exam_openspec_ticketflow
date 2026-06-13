## 1. 基础设施

- [x] 1.1 创建 `tests/smoke/scenarios/` 和 `tests/smoke/reports/` 目录 [SMK-001, SMK-003]

## 2. Skill 入口

- [x] 2.1 创建 `.claude/skills/smoke-scenario/SKILL.md`：定义 frontmatter（name: smoke-scenario, description: 冒烟场景测试），覆盖以下行为 [SMK-002]：
  - `/smoke-scenario` 列出 tests/smoke/scenarios/ 下所有可用场景
  - `/smoke-scenario <name>` 读取场景文件，用 Playwright 逐步执行
  - `/smoke-scenario <name> --headed` 打开可见浏览器执行
  - `/smoke-scenario <name> --url <url>` 覆盖目标 URL（默认 localhost:5173）
  - `/smoke-scenario <name> --wait MS` 步骤间额外等待（默认 500ms）
  - `/smoke-scenario all` 依次执行所有场景
  - 每步记录成功/失败，最后产出场景报告到 tests/smoke/reports/
  - 场景不存在时提示可用场景列表

## 3. 预设场景文件

依赖：1.1（tests/smoke/scenarios/ 目录存在）

- [x] 3.1 创建 `tests/smoke/scenarios/login.md`：admin 登录验证场景 [SMK-004]
  - role: admin
  - steps: goto /login → fill admin/admin → click 登录 → wait 跳转 → check /workbench/admin
  - expect: url 含 /workbench/admin，contains "用户管理"，noError

- [x] 3.2 创建 `tests/smoke/scenarios/create-ticket.md`：submitter 创建工单场景 [SMK-004]
  - role: submitter
  - steps: 登录 → goto /workbench/submitter → fill 标题/描述 → click 提交 → check 工单显示
  - expect: url 含 /workbench/submitter，contains 标题，noError

- [x] 3.3 创建 `tests/smoke/scenarios/full-flow.md`：三角色全流程场景（通过 relogin 切换角色） [SMK-004]
  - 阶段1: relogin submitter → goto /workbench/submitter → fill 标题/描述 → click 提交 → check 工单显示
  - 阶段2: logout → relogin dispatcher → 找到工单 → 指派给 completer
  - 阶段3: logout → relogin completer → 开始处理 → 完成 → check 状态变更
  - expect: 全流程无错误

## 4. 文档

依赖：3.1-3.3（场景文件存在）

- [x] 4.1 更新 `tests/README.md`：新增 `smoke/` 目录的说明（场景冒烟测试，与 e2e/ 的区别），列出三个预设场景及用法 [SMK-002]

## 5. 验证

依赖：全部完成

- [x] 5.1 验证 `/smoke-scenario`（无参数）列出 3 个可用场景 [SMK-002]
- [x] 5.2 对 localhost 执行 `/smoke-scenario login`，验证 Claude 正确解析 frontmatter、用 Playwright 逐步执行、给中文结果 [SMK-002, SMK-004]
- [x] 5.3 对 localhost 执行 `/smoke-scenario create-ticket`，验证创建工单成功 [SMK-002, SMK-004]
- [x] 5.4 对 localhost 执行 `/smoke-scenario full-flow`，验证三阶段全流程 [SMK-002, SMK-004]
- [x] 5.5 对 localhost 执行 `/smoke-scenario all`，验证三个场景依次执行、最后给出汇总 [SMK-002]
- [x] 5.6 验证 `--headed` 参数生效（浏览器窗口可见） [SMK-002]
- [x] 5.7 验证 `--url` 参数覆盖目标 URL [SMK-002]
- [x] 5.8 验证 `--wait 3000` 参数生效（步骤间有额外延迟） [SMK-002]
- [x] 5.9 验证 `tests/smoke/reports/` 下生成场景报告 MD 文件 [SMK-003]
- [x] 5.10 验证场景报告内容：中文叙述、步骤表格、综合判定 [SMK-003]
- [x] 5.11 验证场景不存在时的提示："场景 'xxx' 不存在。可用场景：login, create-ticket, full-flow" [SMK-002]
