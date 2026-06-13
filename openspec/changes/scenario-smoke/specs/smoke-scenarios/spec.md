# smoke-scenarios Specification

## Purpose

冒烟场景定义与执行——标准化的场景 MD 文件，coding agent 读取后用 Playwright 精确执行（登录指定角色、填写表单、点击按钮、验证结果），产出场景级中文报告到 `tests/smoke/reports/`。

## ADDED Requirements

### Requirement: SMK-001 场景文件格式

冒烟场景 SHALL 以 Markdown 文件形式存放在 `tests/smoke/scenarios/` 目录下，每个文件包含 YAML frontmatter（机器可解析）和 Markdown body（人类可读）。Frontmatter SHALL 包含场景元数据、步骤序列和期望结果。

#### Scenario: 场景文件基本结构

- **WHEN** Agent 读取 `tests/smoke/scenarios/<name>.md`
- **THEN** 文件 SHALL 包含以下 frontmatter 字段：`name`（场景标识）、`description`（一句话描述）、`role`（登录角色，可选）、`steps`（步骤数组）、`expect`（期望结果）
- **AND** 每个 step SHALL 包含 `action` 字段（`goto` | `fill` | `click` | `wait` | `check` | `logout` | `relogin`）及对应的参数
- **AND** frontmatter 后 SHALL 有 Markdown body 供人类阅读

#### Scenario: goto 步骤

- **WHEN** step action 为 `goto`
- **THEN** SHALL 指定 `path` 字段（如 `/login`、`/workbench/admin`）
- **AND** 浏览器 SHALL 导航到该路径

#### Scenario: fill 步骤

- **WHEN** step action 为 `fill`
- **THEN** SHALL 指定 `selector`（CSS selector 或 `placeholder` 伪类）和 `value`（填入的值）
- **AND** Agent SHALL 先等待 selector 可见，再填入 value

#### Scenario: click 步骤

- **WHEN** step action 为 `click`
- **THEN** SHALL 指定 `selector`（如 `button:has-text("登")`、`.ant-select-item-option:has-text("完成者")`）
- **AND** Agent SHALL 等待 selector 可见后点击，点击后等待 500ms

#### Scenario: wait 步骤

- **WHEN** step action 为 `wait`
- **THEN** SHALL 指定 `timeout`（毫秒）或 `selector` 加 `timeout`
- **AND** Agent SHALL 等待 selector 可见，或等待 timeout 毫秒后继续

#### Scenario: check 步骤

- **WHEN** step action 为 `check`
- **THEN** SHALL 指定检查项：`url`（URL 包含某字符串）、`contains`（页面包含某文本）、`noError`（无 console/network/antd 错误）
- **AND** 检查结果为失败时 SHALL 在报告中标记该步为 ❌
- **AND** `noError` SHALL 排除已知良性信号：登录前 401 on `/api/auth/me`、antd deprecation warning

#### Scenario: logout 步骤

- **WHEN** step action 为 `logout`
- **THEN** Agent SHALL 先点击登出按钮，再清除浏览器 cookies，最后导航到 `/login`
- **AND** 登出后 SHALL 轮询等待登录表单渲染完成

#### Scenario: relogin 步骤

- **WHEN** step action 为 `relogin`
- **THEN** SHALL 指定 `role` 字段（登录的角色名）
- **AND** Agent SHALL 在当前页面执行登录操作（goto /login → fill 用户名 → fill 密码 → click 登 → wait 跳转）
- **AND** 如指定 `password` 字段则使用该密码，否则默认 `changeme`
- **AND** 页面上的 Ant Design 按钮文本如 `登 录`、`退 出`、`指 派`、`完 成` 可能含空格，SHALL 使用 `:has-text("退")` 等单字子串匹配

#### Scenario: 期望结果

- **WHEN** 场景执行完毕
- **THEN** `expect` 字段 SHALL 作为总体验收条件：
  - `url`: 当前 URL SHALL 包含指定字符串
  - `contains`: 页面 SHALL 包含指定文本
  - `noError`: 整个过程 SHALL 无 console error、network 4xx/5xx、antd error

#### Scenario: 无 role 的场景

- **WHEN** 场景 frontmatter 中 `role` 为空或省略
- **THEN** Agent SHALL 不执行登录操作，直接按步骤执行（适用于登录页测试等未登录场景）

### Requirement: SMK-002 Skill 入口

项目 SHALL 包含 `.claude/skills/smoke-scenario/SKILL.md`，作为场景冒烟测试的 Claude Code 入口。Skill 负责列出场景、读取场景文件、用 Playwright 逐步执行、生成报告。

#### Scenario: 列出可用场景

- **WHEN** 用户输入 `/smoke-scenario`（无参数）
- **THEN** Claude SHALL 列出 `tests/smoke/scenarios/` 下所有 `.md` 文件
- **AND** 每个场景显示 `name` 和 `description`（从 frontmatter 读取）

#### Scenario: 执行单个场景

- **WHEN** 用户输入 `/smoke-scenario login`
- **THEN** Claude SHALL 读取 `tests/smoke/scenarios/login.md`
- **AND** SHALL 解析 frontmatter 获取 steps 和 expect
- **AND** SHALL 使用 Playwright 按步骤序列执行（goto → fill → click → wait → check → logout → relogin）
- **AND** SHALL 每步记录结果（✅/❌）
- **AND** SHALL 执行结束后根据 expect 做综合判定（🟢 通过 / 🔴 失败）
- **AND** SHALL 产出报告到 `tests/smoke/reports/<name>-<timestamp>.md`

#### Scenario: 执行全部场景

- **WHEN** 用户输入 `/smoke-scenario all`
- **THEN** Claude SHALL 依次读取并执行 `tests/smoke/scenarios/` 下所有场景
- **AND** SHALL 每个场景独立报告
- **AND** SHALL 最后给出汇总：N 个场景，M 个通过，K 个失败

#### Scenario: headed 模式

- **WHEN** 用户输入 `/smoke-scenario <name> --headed`
- **THEN** Claude SHALL 启动可见 Chromium 窗口执行场景
- **AND** 未传 `--headed` 时 SHALL 默认 headless

#### Scenario: 覆盖目标 URL

- **WHEN** 用户输入 `/smoke-scenario <name> --url https://staging.example.com`
- **THEN** Claude SHALL 使用指定 URL 作为 base URL 执行场景
- **AND** 未传 `--url` 时 SHALL 默认使用 `http://localhost:5173`

#### Scenario: 自定义等待时间

- **WHEN** 用户输入 `/smoke-scenario <name> --wait 3000`
- **THEN** Claude SHALL 在步骤间额外等待 3000ms（默认 500ms）
- **AND** 适用于远端部署 URL 等需要更长 SPA 渲染等待的场景

#### Scenario: 场景文件不存在

- **WHEN** 用户输入 `/smoke-scenario nonexistent`
- **THEN** Claude SHALL 回复："场景 'nonexistent' 不存在。可用场景：<列出可用场景>"

### Requirement: SMK-003 场景报告

每个场景执行完毕后 SHALL 产出中文 Markdown 报告到 `tests/smoke/reports/`，记录每步执行结果和综合判定。

#### Scenario: 报告文件位置

- **WHEN** 场景 `login` 执行完毕
- **THEN** SHALL 生成报告文件 `tests/smoke/reports/login-<ISO-timestamp>.md`
- **AND** `tests/smoke/reports/` 目录如不存在 SHALL 自动创建

#### Scenario: 报告内容结构

- **WHEN** 报告生成
- **THEN** SHALL 包含：
  - 标题：`# 冒烟场景报告: <name>`
  - 基本信息：时间、URL、角色
  - 执行步骤表格：每步 `序号 | 步骤 | 结果`
  - 综合判定：🟢 通过（全部步骤成功 + expect 满足）/ 🔴 失败（有步骤失败或 expect 不满足）

#### Scenario: 全部通过时简洁呈现

- **WHEN** 所有步骤成功且 expect 满足
- **THEN** 报告 SHALL 以简洁为主，突出"全部通过"

#### Scenario: 有失败时详细展开

- **WHEN** 某步骤失败或 expect 不满足
- **THEN** 报告 SHALL 在失败步骤处展开详细信息：实际值 vs 期望值、错误消息

### Requirement: SMK-004 预设场景

项目 SHALL 在 `tests/smoke/scenarios/` 下预置三个冒烟场景，覆盖核心业务流程。

#### Scenario: login 场景

- **WHEN** `tests/smoke/scenarios/login.md` 存在
- **THEN** 场景 SHALL 定义为：
  - role: admin
  - 步骤: goto /login → fill 用户名 admin → fill 密码 admin → click 登录 → wait 跳转 → check url 包含 /workbench/admin
  - expect: url 包含 /workbench/admin，contains "用户管理"，noError

#### Scenario: create-ticket 场景

- **WHEN** `tests/smoke/scenarios/create-ticket.md` 存在
- **THEN** 场景 SHALL 定义为：
  - role: submitter
  - 步骤: goto /login → fill submitter/changeme → click 登录 → wait 工作台 → goto /workbench/submitter → fill 标题 → fill 描述 → click 提交 → check 工单显示在列表
  - expect: url 包含 /workbench/submitter，contains 刚创建的标题，noError

#### Scenario: full-flow 场景

- **WHEN** `tests/smoke/scenarios/full-flow.md` 存在
- **THEN** 场景 SHALL 定义为三阶段，通过 `relogin` 切换角色：
  - 阶段1（submitter 创建工单）: relogin submitter → goto /workbench/submitter → fill 标题/描述 → click 提交 → check 工单显示
  - 阶段2（dispatcher 指派）: logout → relogin dispatcher → 找到工单 → click 指派给 completer → check 状态变更
  - 阶段3（completer 完成）: logout → relogin completer → 找到工单 → click 开始处理 → click 完成 → check noError
  - expect: 全流程无错误（noError），表分页可能导致 `已完成` 标签不在首页，故不以 `contains` 检查
