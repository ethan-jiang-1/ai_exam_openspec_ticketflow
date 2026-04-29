## 1. 修复 SessionStore crypto 兼容性

> 依赖：无

- [ ] 1.1 修改 `apps/server/src/lib/sessions.ts`：删除 `import { randomUUID } from 'crypto'`，将 `randomUUID()` 改为 `crypto.randomUUID()`（全局 Web Crypto API） [UA-004]
- [ ] 1.2 验证：`pnpm -r run build && pnpm -r run test` 全部通过
- [ ] 1.3 验证：`node scripts/e2e-smoke.mjs` 13 步全绿
- [ ] 1.4 验证：Cloudflare Workers 部署成功（git push 后观察）
