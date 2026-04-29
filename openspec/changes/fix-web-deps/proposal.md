## Why

Cloudflare Pages 构建在 `apps/web` 的 `tsc -b` 阶段失败：`Cannot find module 'react-router-dom'`。与 cloudflare-deploy-config 同类问题——依赖未在 `package.json` 中显式声明，本地开发靠残留的 node_modules 工作，Cloudflare 隔离安装后找不到。

## What Changes

- 在 `apps/web/package.json` 的 dependencies 中添加 `react-router-dom`

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `frontend-env`: 增加前端路由库依赖声明

## Impact

- `apps/web/package.json` — 添加 `react-router-dom` dependency
- `pnpm-lock.yaml` — 自动更新
