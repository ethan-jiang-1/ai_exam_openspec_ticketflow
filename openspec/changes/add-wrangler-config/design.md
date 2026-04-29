## Context

TicketFlow 使用 Cloudflare Pages 部署前端静态资产。构建阶段（`pnpm run build`）已成功，输出到 `apps/web/dist`。但部署阶段（`npx wrangler deploy`）失败，因为 Wrangler 在 pnpm monorepo 根目录找不到项目配置文件，无法确定部署目标。

当前根目录配置文件：`package.json`, `tsconfig.base.json`, `eslint.config.js`, `prettier.config.js` 等。按项目约定，根目录仅放配置文件。

## Goals / Non-Goals

**Goals:**
- 让 `npx wrangler deploy` 在 monorepo 根目录成功执行
- 部署 `apps/web/dist` 为静态资产，支持 SPA 路由
- 配置随代码走，clone 即可部署，无需手动修改 Cloudflare dashboard

**Non-Goals:**
- 不部署后端 API（apps/server 使用本地 SQLite，无法直接部署到 Workers）
- 不涉及 Cloudflare Workers 脚本（纯静态资产模式）
- 不修改现有构建流程

## Decisions

### D1: 使用 wrangler.jsonc（非 wrangler.toml）

Cloudflare 官方推荐新项目使用 JSONC 格式，部分新功能仅支持 JSONC。JSONC 支持注释，便于标注配置用途。

**替代方案**: `wrangler.toml` — 旧格式，同样可用，但官方已不推荐新项目使用。

### D2: Assets-only Worker（无 main 入口）

不定义 `main` 字段。Wrangler 文档明确指出 `main` 对 assets-only Worker 是可选的。无需 Worker 脚本即可部署纯静态站点。

**替代方案**: 定义一个空 Worker 脚本 + `assets.directory` — 增加不必要的复杂度。

### D3: not_found_handling 设为 single-page-application

前端使用 React Router（客户端路由），所有未匹配路径必须返回 `index.html` 让前端路由处理。`single-page-application` 模式正是为此设计。

### D4: compatibility_date 使用固定日期

使用 `"2026-04-29"`（今日日期）。Workers runtime 以此决定行为版本。

### D5: $schema 指向 node_modules 中的 schema

`"$schema": "./node_modules/wrangler/config-schema.json"` — Wrangler 官方模板推荐此写法，提供 IDE 自动补全。由于 Cloudflare 构建环境会安装依赖，此路径在部署时有效。本地开发时需先 `pnpm install`。

## Directory Layout

```
├── wrangler.jsonc          ← 新增文件
├── apps/
│   └── web/
│       └── dist/           ← assets.directory 指向此处
├── package.json
└── ...
```

## Risks / Trade-offs

- [Cloudflare 项目类型冲突] → 如果 Cloudflare 上的项目最初以 Pages 模式创建，Workers assets-only 部署可能需要迁移。若遇到此问题，需参考 Cloudflare "Migrate from Pages to Workers" 指南。
- [wrangler 版本差异] → Cloudflare 构建环境通过 `npx wrangler` 使用最新版。`$schema` 路径在安装后有效，不影响部署本身。

## Open Questions

1. Cloudflare 上的项目当前是 Pages 项目还是 Workers 项目？如果是 Pages 项目，是否需要先迁移为 Workers 项目？
2. 部署成功后，Cloudflare 的 build output directory 设置是否需要从 `apps/web/dist` 改为空或其他值？还是保留不变（由 wrangler.jsonc 接管）？
