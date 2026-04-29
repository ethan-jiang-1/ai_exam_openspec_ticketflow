## Why

`sessions.ts` 使用 Node.js 专属 `import { randomUUID } from 'crypto'`，Cloudflare Workers 构建时报错 `Could not resolve "crypto"`，导致部署失败。

## What Changes

- 将 `sessions.ts` 的 `randomUUID` 来源从 Node.js `crypto` 模块改为全局 `crypto.randomUUID()`（Web Crypto API），Node.js >= 19 和 Cloudflare Workers 均原生支持

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `user-auth`: UA-004 SessionStore 的 session ID 生成方式从 Node.js `crypto` 改为 Web Crypto API

## Impact

- `apps/server/src/lib/sessions.ts` — 删除 `import { randomUUID } from 'crypto'`，改用全局 `crypto.randomUUID()`
- `apps/server/src/__tests__/sessions.test.ts` — 无需改动（行为不变，仅内部实现变化）

## Success Criteria

- `pnpm -r run build && pnpm -r run test` 全部通过
- `node scripts/e2e-smoke.mjs` 13 步全绿
- Cloudflare Workers 部署成功，`/health` 端点正常响应
