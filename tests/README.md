# tests/

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
