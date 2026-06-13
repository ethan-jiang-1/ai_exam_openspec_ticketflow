# tests/

## smoke/

冒烟场景测试——精确的浏览器自动化场景，读取 `smoke/scenarios/` 下的场景 MD 文件，用 Playwright 按步骤执行（登录指定角色、填写表单、点击按钮、验证结果），产出中文报告到 `smoke/reports/`。

与 `e2e/` 的区别：e2e 使用 Playwright test runner + 断言，smoke 由 Claude Code skill 驱动、无 test runner、场景定义与执行解耦。

### 预设场景

| 场景 | 文件 | 说明 |
|------|------|------|
| login | `scenarios/login.md` | admin 登录验证 |
| create-ticket | `scenarios/create-ticket.md` | submitter 创建工单 |
| full-flow | `scenarios/full-flow.md` | 三角色全流程（submitter → dispatcher → completer） |

### 用法

在 Claude Code 中使用 `/smoke-scenario` 命令：

```
/smoke-scenario              # 列出所有场景
/smoke-scenario login        # 执行登录场景
/smoke-scenario all          # 执行所有场景
/smoke-scenario login --headed --url http://localhost:5173
```

## e2e/

Playwright 浏览器端到端测试。

| 文件 | 覆盖内容 |
|------|----------|
| `login.spec.ts` | 登录/登出/会话过期自动跳转 |
| `workflow.spec.ts` | 完整工单流转：创建→指派→处理→完成 |
| `routing.spec.ts` | 路由守卫与角色重定向 |

运行：

```bash
pnpm e2e                  # headless
pnpm e2e:local            # 对 localhost:5173
pnpm e2e:remote           # 对 Cloudflare 部署
pnpm e2e:diagnose         # headed 可见浏览器，手动调试
pnpm e2e:investigate      # headless 自动探查，捕获截图+network+console
```
