## Why

Cloudflare Pages 构建阶段已成功（`pnpm run build` 输出 `apps/web/dist`），但部署阶段 `npx wrangler deploy` 失败，错误为 "The Wrangler application detection logic has been run in the root of a workspace instead of targeting a specific project"。Wrangler 在 monorepo 根目录找不到项目配置，无法确定要部署什么。添加 `wrangler.jsonc` 配置文件后，Wrangler 不再需要自动检测，直接按配置部署静态资产。

## What Changes

- 在仓库根目录新增 `wrangler.jsonc`，声明 Workers 静态资产模式（assets-only Worker）
- 配置 `assets.directory` 指向 `./apps/web/dist`，`not_found_handling` 为 `single-page-application`
- 不需要 `main` 入口（纯静态部署），不需要 Worker 脚本

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `dev-tooling`: 新增 DT-007 Wrangler 静态资产部署配置要求

## Impact

- **新增文件**: `wrangler.jsonc`（仓库根目录）
- **不涉及**: 代码变更、依赖变更、API 变更
- **影响系统**: Cloudflare Pages 部署流程

## Success Criteria

- `wrangler.jsonc` 存在于仓库根目录，包含正确的 assets 配置
- Cloudflare Pages 部署完整通过（build + deploy 均成功）
- `pnpm check`（lint + typecheck + test + build）在本地全绿
