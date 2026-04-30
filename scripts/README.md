# scripts/

项目辅助脚本，按测试层次分三类：

| 脚本 | 命令 | 浏览器 | 说明 |
|------|------|--------|------|
| `e2e-smoke.mjs` | — | 无 | API 冒烟测试，Node.js fetch 直接调 API，不启动浏览器 |
| `e2e-diagnose.mjs` | `pnpm e2e:diagnose` | headed（可见） | 诊断模式，打开有头浏览器，手动调试 Cloudflare/本地问题 |
| `e2e-investigate-remote.mjs` | `pnpm e2e:investigate` | headless | 调查模式，自动探查远程环境，捕获截图+network+console 全量数据 |

## 三者区别

```
e2e-smoke          → API 层验证（无浏览器，最快的端到端健康检查）
e2e-diagnose       → 手动调试（可见浏览器，实时 network log，你来操作）
e2e-investigate    → 自动探查（headless，我替你操作，出诊断报告）
```

真正的 E2E 测试（Playwright + 断言）在 `tests/e2e/`，通过 `pnpm e2e` 运行。
