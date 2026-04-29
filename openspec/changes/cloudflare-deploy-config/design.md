## Context

TicketFlow 使用 pnpm monorepo，`typescript` 未在任何 workspace 的 `package.json` 中显式声明，而是作为 `typescript-eslint` 的 peer dependency 被 pnpm 自动解析（当前版本 6.0.3）。本地开发时 pnpm hoisting 使 `tsc` 在所有 workspace 可用，但 Cloudflare Pages 构建环境中各 workspace 独立安装依赖，找不到 `tsc` 二进制。

根 `package.json` 也缺少 `packageManager` 字段，Cloudflare 无法确定应使用的 pnpm 版本。

## Goals / Non-Goals

**Goals:**
- 修复 Cloudflare Pages 构建失败问题
- 确保每个 workspace 的构建步骤在隔离环境中可独立运行

**Non-Goals:**
- 不修改构建流程本身（仍使用 `tsc --noEmit` + `vite build`）
- 不引入 CI/CD 配置文件
- 不调整 `apps/server` 的依赖（server 使用 `tsx` 运行，不依赖 `tsc`）

## Decisions

1. **在每个需要 `tsc` 的 workspace 中显式声明 `typescript` devDependency**
   - `packages/shared` 和 `apps/web` 的 build script 都直接调用 `tsc`
   - 版本使用 `^6.0.3`（当前 pnpm 解析到的实际版本）
   - 替代方案：使用 `npx tsc` 或调整 build script → 不采用，显式声明更可靠

2. **根 `package.json` 添加 `packageManager` 字段**
   - 值为 `pnpm@10.27.0`（与本地开发环境一致，Cloudflare 会按此版本安装）
   - 确保 Cloudflare 使用与本地开发相同的 pnpm 版本

## Risks / Trade-offs

- **[版本漂移风险]** 各 workspace 的 typescript 版本可能与根不一致 → 统一使用 `^6.0.3`（当前解析版本），后续可通过 renovate 统一管理
- **[重复声明]** typescript 在多个 package.json 中重复声明 → 这是 monorepo 隔离部署的正当需求

## Open Questions

1. Cloudflare Pages 是否支持 `packageManager` 字段自动切换 pnpm 版本？如果不支持，是否需要在 Cloudflare 设置中手动指定？
2. `apps/server` 当前未在 build 中调用 `tsc`，如果未来 server 也需要类型检查构建，是否需要同步添加？
