## 1. 依赖声明

- [ ] 1.1 在 `packages/shared/package.json` 的 devDependencies 中添加 `typescript: "^6.0.3"` [DT-005]
- [ ] 1.2 在 `apps/web/package.json` 的 devDependencies 中添加 `typescript: "^6.0.3"` [DT-005]
- [ ] 1.3 在根 `package.json` 添加 `"packageManager": "pnpm@10.27.0"` [DT-006]
- [ ] 1.4 执行 `pnpm install` 更新 lockfile [DT-005, DT-006]

## 2. 验证（依赖 1.4）

- [ ] 2.1 运行 `pnpm -w run check`（build + test + lint）确认全部通过 [DT-005 Scenario 2]
- [ ] 2.2 确认部署后 Cloudflare Pages 构建通过（需部署验证）[DT-006 Scenario 1]
