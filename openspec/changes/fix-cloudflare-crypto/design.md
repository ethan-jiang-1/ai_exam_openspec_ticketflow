## Context

`sessions.ts` 在 mvp-user-auth 中引入，使用 `import { randomUUID } from 'crypto'` 生成 session ID。Node.js 的 `crypto` 模块是内置模块，但在 Cloudflare Workers 运行时中不存在，导致 Wrangler 构建失败：`Could not resolve "crypto"`。

当前状态：部署阻断，所有 API 和前端代码正常，仅此一处不兼容。

## Goals / Non-Goals

**Goals:**
- 消除 Cloudflare Workers 构建错误，恢复部署能力
- 保持本地 Node.js 环境正常运行

**Non-Goals:**
- 不解决 SessionStore 内存存储在 Workers 无状态环境中的持久化问题（后续 change 处理）
- 不引入新的 polyfill 或依赖

## Decisions

### D1: 使用全局 `crypto.randomUUID()` 替代 Node.js `import`

**选择**: 删除 `import { randomUUID } from 'crypto'`，直接使用全局 `crypto.randomUUID()`

**理由**: `crypto.randomUUID()` 是 Web Crypto API 的一部分，Node.js >= 19 和 Cloudflare Workers 均原生支持。零依赖、零 polyfill、行为完全一致。

**备选方案**:
- 添加 `nodejs_compat` 兼容标志 → 引入整个 Node.js 兼容层，过重
- 自行实现 UUID 生成 → 引入不必要的复杂度

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Workers 无状态环境下内存 SessionStore 不持久 | 当前 MVP 阶段可接受，后续 change 迁移到 D1/KV |
| 全局 `crypto` 在旧 Node.js (< 19) 不可用 | package.json engines 声明 `>=18.0.0`，理论上 18 不支持，但实际本地开发使用 >= 22，Workers 运行时自身支持，无实际影响 |

## Open Questions

1. SessionStore 迁移到持久化存储（D1 或 KV）的优先级和时机？
2. 是否需要在 CI 中增加 Cloudflare Workers 构建验证步骤，防止类似问题再次出现？
