## Why

Cloudflare Pages 构建失败：`pnpm run build` 执行 `tsc --noEmit` 时报 `tsc: not found`。原因是 pnpm workspaces 中 `typescript` 仅在根 `package.json` 声明，子 workspace 在 Cloudflare 的独立构建环境中找不到 `tsc` 二进制。

## What Changes

- 在 `packages/shared/package.json` 和 `apps/web/package.json` 的 devDependencies 中显式添加 `typescript`
- 在根 `package.json` 添加 `packageManager` 字段，确保 Cloudflare 使用正确版本的 pnpm

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `dev-tooling`: 增加子 workspace 显式 typescript 依赖声明要求和 packageManager 字段要求

## Impact

- `packages/shared/package.json` — 添加 `typescript` devDependency
- `apps/web/package.json` — 添加 `typescript` devDependency
- `package.json`（根）— 添加 `packageManager` 字段
- `pnpm-lock.yaml` — 自动更新
