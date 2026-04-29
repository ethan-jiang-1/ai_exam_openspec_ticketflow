## Context

`react-router-dom@7.14.2` 存在于 `apps/web/node_modules`（本地残留安装），但未在 `apps/web/package.json` 中声明，也不在 `pnpm-lock.yaml` 中。6 个源文件引用了该模块。Cloudflare Pages 隔离安装后找不到此模块导致 `tsc -b` 失败。

## Goals / Non-Goals

**Goals:**
- 修复 Cloudflare Pages 构建中 `react-router-dom` 缺失问题

**Non-Goals:**
- 不升级 react-router-dom 版本
- 不修改路由代码或路由配置

## Decisions

1. **在 `apps/web/package.json` 的 dependencies 中添加 `react-router-dom: "^7.14.2"`**
   - 版本使用当前本地安装的 7.14.2
   - react-router-dom v7 内置 TypeScript 类型声明，无需额外 `@types` 包
   - 放在 dependencies 而非 devDependencies，因为是运行时依赖

## Risks / Trade-offs

- **[版本不确定性]** 本地残留的 7.14.2 可能不是最初安装时的版本 → 使用 `^7.14.2` 范围，与当前一致即可

## Open Questions

1. 本地之前是如何安装 react-router-dom 却未写入 package.json 的？可能是开发过程中手动 `pnpm add` 后又撤销了 package.json 变更
2. 是否还有其他类似的未声明依赖？Cloudflare 构建可能继续暴露更多遗漏
